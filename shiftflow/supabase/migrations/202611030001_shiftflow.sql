-- ShiftFlow: apply through Supabase migrations. No service-role key in the browser.
begin;
revoke create on schema public from public;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  timezone text not null default 'Europe/Belgrade' check (timezone = 'Europe/Belgrade'),
  rules jsonb not null default '{"minRestHours":12,"maxWeeklyHours":40,"restSeverity":"block","hoursSeverity":"block","allowMultiple":false}',
  created_at timestamptz not null default now()
);
create table public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now()
);
create index memberships_company on public.memberships(company_id);
create function public.is_member(p_company uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.memberships where company_id = p_company and user_id = auth.uid());
$$;
create function public.is_owner(p_company uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.memberships where company_id = p_company and user_id = auth.uid() and role = 'owner');
$$;

create table public.employees (
  company_id uuid not null references public.companies(id) on delete cascade,
  id text not null, name text not null check (char_length(name) between 2 and 80),
  initials text not null, color text not null, active boolean not null default true,
  target_hours numeric not null check (target_hours between 8 and 80),
  preferred_shift text, primary key(company_id, id)
);
create table public.employee_positions (
  company_id uuid not null, employee_id text not null,
  position text not null check (position in ('Barista','Konobar','Menadžer')),
  primary key(company_id, employee_id, position),
  foreign key(company_id, employee_id) references public.employees(company_id,id) on delete cascade
);
create table public.availability (
  company_id uuid not null, employee_id text not null,
  weekday integer not null check (weekday between 0 and 6), available boolean not null default false,
  primary key(company_id, employee_id, weekday),
  foreign key(company_id,employee_id) references public.employees(company_id,id) on delete cascade
);
create table public.shift_templates (
  company_id uuid not null references public.companies(id) on delete cascade,
  id text not null, name text not null, starts_at time not null, ends_at time not null,
  color text not null, check (starts_at <> ends_at), primary key(company_id,id)
);
create table public.staffing_requirements (
  company_id uuid not null, weekday integer not null check (weekday between 0 and 6),
  template_id text not null, position text not null check (position in ('Barista','Konobar','Menadžer')),
  required_count integer not null check (required_count between 0 and 20),
  primary key(company_id,weekday,template_id,position),
  foreign key(company_id,template_id) references public.shift_templates(company_id,id) on delete cascade
);
create table public.schedules (
  company_id uuid not null references public.companies(id) on delete cascade,
  week date not null check (extract(isodow from week) = 1),
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz, version bigint not null default 1,
  primary key(company_id,week)
);
create table public.assignments (
  company_id uuid not null, id text not null, week date not null,
  employee_id text not null, template_id text not null,
  weekday integer not null check (weekday between 0 and 6),
  position text not null check (position in ('Barista','Konobar','Menadžer')),
  locked boolean not null default false, internal_note text not null default '' check (char_length(internal_note) <= 500),
  primary key(company_id,id,week),
  foreign key(company_id,week) references public.schedules(company_id,week) on delete cascade,
  foreign key(company_id,employee_id) references public.employees(company_id,id),
  foreign key(company_id,template_id) references public.shift_templates(company_id,id)
);
create index assignments_schedule on public.assignments(company_id,week,weekday);
create table public.absences (
  company_id uuid not null, id uuid primary key default gen_random_uuid(), employee_id text not null,
  starts_on date not null, ends_on date not null, reason text not null default '',
  check(ends_on >= starts_on),
  foreign key(company_id,employee_id) references public.employees(company_id,id)
);
create table public.replacements (
  company_id uuid not null, id uuid primary key default gen_random_uuid(),
  week date not null, assignment_id text not null, original_employee_id text not null,
  replacement_employee_id text not null, note text not null default '', created_at timestamptz not null default now(),
  foreign key(company_id,assignment_id,week) references public.assignments(company_id,id,week) on delete cascade,
  foreign key(company_id,original_employee_id) references public.employees(company_id,id),
  foreign key(company_id,replacement_employee_id) references public.employees(company_id,id)
);
create table public.workspace_documents (
  company_id uuid primary key references public.companies(id) on delete cascade,
  state jsonb not null default '{}', version bigint not null default 0,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
-- Append-only server audit, independent of the capped client undo stack.
create table public.change_history (
  company_id uuid not null references public.companies(id) on delete cascade,
  sequence bigint generated always as identity primary key,
  version bigint not null, changed_by uuid references auth.users(id),
  previous_state jsonb not null, next_state jsonb not null,
  created_at timestamptz not null default now(), unique(company_id, version)
);
create table public.schedule_links (
  company_id uuid not null, week date not null,
  token_hash bytea not null unique, expires_at timestamptz not null,
  created_by uuid references auth.users(id), primary key(company_id,week),
  foreign key(company_id,week) references public.schedules(company_id,week) on delete cascade
);
create table public.notifications (
  company_id uuid not null references public.companies(id) on delete cascade,
  id uuid primary key default gen_random_uuid(), message text not null,
  created_at timestamptz not null default now()
);

-- Tenant reads only; all state writes use the single atomic save RPC.
alter table public.companies enable row level security;
create policy company_read on public.companies for select to authenticated using(public.is_member(id));
alter table public.memberships enable row level security;
create policy membership_read on public.memberships for select to authenticated using(public.is_member(company_id));
do $$ declare t text; begin
  foreach t in array array['employees','employee_positions','availability','shift_templates','staffing_requirements','schedules','assignments','absences','replacements','workspace_documents','change_history','schedule_links','notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy tenant_read on public.%I for select to authenticated using(public.is_member(company_id))', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
revoke all on public.companies, public.memberships from anon, authenticated;
grant select on public.companies, public.memberships to authenticated;

create function public.bootstrap_company() returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid; company_name text;
begin
  company_name := left(coalesce(nullif(trim(new.raw_user_meta_data->>'company_name'),''),'Moj kafić'),80);
  insert into public.companies(name) values(company_name) returning id into cid;
  insert into public.memberships(user_id,company_id,role) values(new.id,cid,'owner');
  insert into public.workspace_documents(company_id) values(cid);
  return new;
end $$;
create trigger on_shiftflow_signup after insert on auth.users for each row execute function public.bootstrap_company();

create function public.assert_publishable(p_company uuid,p_week date) returns void language plpgsql security definer set search_path = public as $$
declare rules jsonb;
begin
  select c.rules into rules from public.companies c where id=p_company;
  if exists(select 1 from public.staffing_requirements r where r.company_id=p_company and r.required_count > (select count(*) from public.assignments a where a.company_id=r.company_id and a.week=p_week and a.weekday=r.weekday and a.template_id=r.template_id and a.position=r.position)) then raise exception 'UNFILLED_REQUIREMENTS'; end if;
  if exists(select 1 from public.assignments a join public.employees e on e.company_id=a.company_id and e.id=a.employee_id where a.company_id=p_company and a.week=p_week and (not e.active or not exists(select 1 from public.employee_positions ep where ep.company_id=a.company_id and ep.employee_id=a.employee_id and ep.position=a.position) or exists(select 1 from public.availability av where av.company_id=a.company_id and av.employee_id=a.employee_id and av.weekday=a.weekday and not av.available))) then raise exception 'EMPLOYEE_UNAVAILABLE_OR_INELIGIBLE'; end if;
  if not (rules->>'allowMultiple')::boolean and exists(select 1 from public.assignments where company_id=p_company and week=p_week group by employee_id,weekday having count(*)>1) then raise exception 'MULTIPLE_SHIFTS_PROHIBITED'; end if;
  if rules->>'hoursSeverity'='block' and exists(select 1 from public.assignments a join public.shift_templates t on t.company_id=a.company_id and t.id=a.template_id where a.company_id=p_company and a.week=p_week group by a.employee_id having sum(extract(epoch from t.ends_at-t.starts_at)/3600 + case when t.ends_at<=t.starts_at then 24 else 0 end)>(rules->>'maxWeeklyHours')::numeric) then raise exception 'WEEKLY_HOURS_EXCEEDED'; end if;
  if exists(with timed as (
    select a.id,a.week,a.employee_id,(a.week+a.weekday)+t.starts_at as starts,(a.week+a.weekday)+t.ends_at+case when t.ends_at<=t.starts_at then interval '1 day' else interval '0' end as ends
    from public.assignments a join public.shift_templates t on t.company_id=a.company_id and t.id=a.template_id where a.company_id=p_company and a.week between p_week-7 and p_week+7
  ) select 1 from timed a join timed b on a.employee_id=b.employee_id and (a.week,a.id)<>(b.week,b.id) where a.week=p_week and (
    (a.starts<b.ends and b.starts<a.ends) or (rules->>'restSeverity'='block' and extract(epoch from greatest(a.starts-b.ends,b.starts-a.ends))/3600 < (rules->>'minRestHours')::numeric)
  )) then raise exception 'OVERLAP_OR_INSUFFICIENT_REST'; end if;
end $$;

create function public.save_workspace(p_company uuid, p_state jsonb, p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare old_doc public.workspace_documents; body jsonb; person jsonb; template jsonb; req jsonb; sched record; shift jsonb; next_version bigint; requested_rules jsonb;
begin
  if not public.is_member(p_company) then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into old_doc from public.workspace_documents where company_id=p_company for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if old_doc.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  body := p_state->'current'; requested_rules := body->'rules';
  if p_state->>'schema' <> '1' or jsonb_typeof(body) <> 'object' or jsonb_typeof(body->'employees') <> 'array' or jsonb_typeof(body->'schedules') <> 'object' then raise exception 'INVALID_STATE'; end if;
  if not public.is_owner(p_company) and exists(select 1 from public.companies where id=p_company and (name is distinct from body->>'name' or rules is distinct from requested_rules)) then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
  if (requested_rules->>'minRestHours')::numeric not between 0 and 48 or (requested_rules->>'maxWeeklyHours')::numeric not between 8 and 168 or requested_rules->>'restSeverity' not in ('warning','block') or requested_rules->>'hoursSeverity' not in ('warning','block') then raise exception 'INVALID_RULES'; end if;
  next_version := old_doc.version+1;
  update public.companies set name=body->>'name', rules=requested_rules where id=p_company;

  -- Reconcile the normalized projection within the same transaction as history.
  delete from public.assignments a where a.company_id=p_company and not exists(
    select 1 from jsonb_each(body->'schedules') ss cross join lateral jsonb_array_elements(ss.value->'assignments') sh
    where ss.key::date=a.week and sh->>'id'=a.id
  );
  delete from public.staffing_requirements where company_id=p_company;
  delete from public.employee_positions where company_id=p_company;
  delete from public.availability where company_id=p_company;
  for person in select value from jsonb_array_elements(body->'employees') loop
    insert into public.employees(company_id,id,name,initials,color,active,target_hours,preferred_shift)
    values(p_company,person->>'id',person->>'name',person->>'initials',person->>'color',(person->>'active')::boolean,(person->>'targetHours')::numeric,person->>'preferredShift')
    on conflict(company_id,id) do update set name=excluded.name,initials=excluded.initials,color=excluded.color,active=excluded.active,target_hours=excluded.target_hours,preferred_shift=excluded.preferred_shift;
    insert into public.employee_positions(company_id,employee_id,position) select p_company,person->>'id',value from jsonb_array_elements_text(person->'positions');
    insert into public.availability(company_id,employee_id,weekday) select p_company,person->>'id',value::integer from jsonb_array_elements_text(person->'daysOff');
  end loop;
  update public.employees set active=false where company_id=p_company and id not in(select value->>'id' from jsonb_array_elements(body->'employees'));
  for template in select value from jsonb_array_elements(body->'templates') loop
    insert into public.shift_templates(company_id,id,name,starts_at,ends_at,color)
    values(p_company,template->>'id',template->>'name',(template->>'start')::time,(template->>'end')::time,template->>'color')
    on conflict(company_id,id) do update set name=excluded.name,starts_at=excluded.starts_at,ends_at=excluded.ends_at,color=excluded.color;
  end loop;
  for req in select value from jsonb_array_elements(body->'requirements') loop
    insert into public.staffing_requirements(company_id,weekday,template_id,position,required_count)
    values(p_company,(req->>'day')::integer,req->>'templateId',req->>'position',(req->>'count')::integer);
  end loop;
  delete from public.schedules where company_id=p_company and week::text not in(select key from jsonb_each(body->'schedules'));
  for sched in select key,value from jsonb_each(body->'schedules') loop
    insert into public.schedules(company_id,week,status,published_at,version)
    values(p_company,sched.key::date,sched.value->>'status',(sched.value->>'publishedAt')::timestamptz,next_version)
    on conflict(company_id,week) do update set status=excluded.status,published_at=excluded.published_at,version=excluded.version;
    for shift in select value from jsonb_array_elements(sched.value->'assignments') loop
      insert into public.assignments(company_id,id,week,employee_id,template_id,weekday,position,locked,internal_note)
      values(p_company,shift->>'id',sched.key::date,shift->>'employeeId',shift->>'templateId',(shift->>'day')::integer,shift->>'position',coalesce((shift->>'locked')::boolean,false),coalesce(shift->>'note',''))
      on conflict(company_id,id,week) do update set employee_id=excluded.employee_id,template_id=excluded.template_id,weekday=excluded.weekday,position=excluded.position,locked=excluded.locked,internal_note=excluded.internal_note;
    end loop;
    if sched.value->>'status'='published' and coalesce(old_doc.state#>>array['current','schedules',sched.key,'status'],'draft') <> 'published' then
      insert into public.notifications(company_id,message) values(p_company,'Objavljen je raspored za nedelju od '||sched.key||'.');
    end if;
  end loop;
  for sched in select week from public.schedules where company_id=p_company and status='published' loop
    perform public.assert_publishable(p_company,sched.week);
  end loop;
  insert into public.change_history(company_id,version,changed_by,previous_state,next_state) values(p_company,next_version,auth.uid(),old_doc.state,p_state);
  update public.workspace_documents set state=p_state,version=next_version,updated_by=auth.uid(),updated_at=now() where company_id=p_company;
  return next_version;
end $$;

-- A token is 244 bits of randomness. Only its SHA-256 hash is stored.
create function public.rotate_schedule_link(p_company uuid,p_week date) returns text language plpgsql security definer set search_path = public as $$
declare token text;
begin
  if not public.is_member(p_company) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if not exists(select 1 from public.schedules where company_id=p_company and week=p_week and status='published') then raise exception 'SCHEDULE_NOT_PUBLISHED'; end if;
  token := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
  insert into public.schedule_links(company_id,week,token_hash,expires_at,created_by) values(p_company,p_week,sha256(convert_to(token,'UTF8')),now()+interval '60 days',auth.uid())
  on conflict(company_id,week) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,created_by=excluded.created_by;
  return token;
end $$;
create function public.revoke_schedule_link(p_company uuid,p_week date) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_company) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  delete from public.schedule_links where company_id=p_company and week=p_week;
end $$;
create function public.read_shared_schedule(p_token text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name',c.name,
    'schedule',jsonb_build_object('week',s.week,'status',s.status,'assignments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'employeeId',a.employee_id,'day',a.weekday,'templateId',a.template_id,'position',a.position) order by a.weekday,a.employee_id) from public.assignments a where a.company_id=s.company_id and a.week=s.week),'[]'::jsonb)),
    'employees',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name)) from public.employees e where e.company_id=s.company_id and exists(select 1 from public.assignments a where a.company_id=e.company_id and a.employee_id=e.id and a.week=s.week)),'[]'::jsonb),
    'templates',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'start',to_char(t.starts_at,'HH24:MI'),'end',to_char(t.ends_at,'HH24:MI'),'color',t.color)) from public.shift_templates t where t.company_id=s.company_id),'[]'::jsonb))
  from public.schedule_links l join public.schedules s on s.company_id=l.company_id and s.week=l.week join public.companies c on c.id=s.company_id
  where l.token_hash=sha256(convert_to(p_token,'UTF8')) and l.expires_at>now() and s.status='published' and length(p_token)=64;
$$;

-- Owner-controlled access to an existing user by ID. One company per user.
create function public.add_manager(p_company uuid,p_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner(p_company) then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
  insert into public.memberships(user_id,company_id,role) values(p_user,p_company,'manager');
end $$;

revoke all on function public.bootstrap_company() from public,anon,authenticated;
revoke all on function public.assert_publishable(uuid,date) from public,anon,authenticated;
revoke all on function public.save_workspace(uuid,jsonb,bigint),public.rotate_schedule_link(uuid,date),public.revoke_schedule_link(uuid,date),public.add_manager(uuid,uuid) from public,anon;
revoke all on function public.is_member(uuid),public.is_owner(uuid),public.read_shared_schedule(text) from public;
grant execute on function public.save_workspace(uuid,jsonb,bigint),public.rotate_schedule_link(uuid,date),public.revoke_schedule_link(uuid,date),public.add_manager(uuid,uuid),public.is_member(uuid),public.is_owner(uuid) to authenticated;
grant execute on function public.read_shared_schedule(text) to anon,authenticated;
commit;
