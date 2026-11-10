-- Draft writes are restricted to transaction functions; public tables have no direct write grants.
alter table public.workspaces add column setup_revision bigint not null default 0;
create function public.bump_timezone_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  new.setup_revision := old.setup_revision + 1;
  return new;
end $$;
create trigger bump_timezone before update of timezone on public.workspaces for each row
  when (old.timezone is distinct from new.timezone) execute function public.bump_timezone_revision();
revoke all on function public.bump_timezone_revision() from public, anon, authenticated;
create function public.bump_setup_revision() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.workspaces set setup_revision = setup_revision + 1 where id = coalesce(new.workspace_id, old.workspace_id);
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['roles','employees','employee_roles','shift_templates','availability_windows','availability_exceptions','staffing_requirements','scheduling_rules'] loop
    execute format('create trigger bump_setup after insert or update or delete on public.%I for each row execute function public.bump_setup_revision()',t);
  end loop;
end $$;
revoke all on function public.bump_setup_revision() from public, anon, authenticated;

create table public.schedule_weeks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  revision bigint not null default 0,
  setup_revision bigint not null default 0,
  published_revision bigint,
  unique (id, workspace_id), unique (workspace_id, week_start)
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  week_id uuid not null,
  slot_key text not null check (length(slot_key) between 1 and 200),
  local_date date not null,
  role_id uuid not null,
  shift_template_id uuid not null,
  position smallint not null check (position between 0 and 99),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  employee_id uuid,
  locked boolean not null default false,
  unique (week_id, slot_key), unique (week_id, local_date, role_id, shift_template_id, position),
  foreign key (week_id, workspace_id) references public.schedule_weeks(id, workspace_id) on delete cascade,
  foreign key (employee_id, workspace_id) references public.employees(id, workspace_id),
  foreign key (role_id, workspace_id) references public.roles(id, workspace_id),
  foreign key (shift_template_id, workspace_id) references public.shift_templates(id, workspace_id)
);
create index assignment_employee_time on public.assignments(workspace_id, employee_id, starts_at, ends_at);
create table public.change_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  week_id uuid not null,
  actor_id uuid not null,
  revision bigint not null,
  operation text not null,
  created_at timestamptz not null default now(),
  foreign key (week_id, workspace_id) references public.schedule_weeks(id, workspace_id) on delete cascade
);
create index change_events_week on public.change_events(workspace_id, week_id, revision);
create table public.operation_receipts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  operation_id uuid not null,
  week_id uuid not null,
  revision bigint not null,
  primary key (workspace_id, operation_id),
  foreign key (week_id, workspace_id) references public.schedule_weeks(id, workspace_id) on delete cascade
);
create table public.published_revisions (
  workspace_id uuid not null,
  week_id uuid not null,
  revision bigint not null,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  primary key (week_id, revision),
  foreign key (week_id, workspace_id) references public.schedule_weeks(id, workspace_id) on delete cascade
);
create table public.team_links (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index published_workspace_week on public.schedule_weeks(workspace_id, week_start);

do $$ declare t text; begin
  foreach t in array array['schedule_weeks','assignments','change_events','operation_receipts','published_revisions','team_links'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;
create policy week_read on public.schedule_weeks for select to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy assignment_read on public.assignments for select to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy publication_read on public.published_revisions for select to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
grant select on public.schedule_weeks, public.assignments, public.published_revisions to authenticated;

-- Validates all saved assignments, including assignments in neighboring weeks.
create function public.assert_schedule_valid(p_workspace uuid, p_week uuid) returns void language plpgsql security definer set search_path = '' as $$
declare assignment record; d date; monday_date date; segment_start timestamptz; segment_end timestamptz; covered tstzmultirange; max_week numeric; max_day numeric; min_rest interval; zone text;
begin
  select w.timezone, r.max_weekly_hours, r.max_daily_hours, make_interval(secs => r.min_rest_hours * 3600)
  into zone, max_week, max_day, min_rest from public.workspaces w join public.scheduling_rules r on r.workspace_id=w.id where w.id=p_workspace;
  if zone is null then raise exception 'Workspace rules missing'; end if;
  if exists (select 1 from public.assignments a join public.schedule_weeks sw on sw.id=a.week_id
    where a.week_id=p_week and (a.local_date < sw.week_start or a.local_date >= sw.week_start+7)) then raise exception 'Slot outside week'; end if;
  if exists (select 1 from public.assignments a left join public.employees e on e.id=a.employee_id and e.workspace_id=a.workspace_id
    where a.week_id=p_week and a.employee_id is not null and (e.id is null or not e.active or not exists
      (select 1 from public.employee_roles er where er.workspace_id=p_workspace and er.employee_id=a.employee_id and er.role_id=a.role_id))) then raise exception 'Inactive or role-ineligible employee'; end if;
  for assignment in select * from public.assignments where week_id=p_week and employee_id is not null loop
    -- Cover every local-day segment, so overnight assignments require next-day availability.
    for d in select generate_series((assignment.starts_at at time zone zone)::date, ((assignment.ends_at - interval '1 microsecond') at time zone zone)::date, interval '1 day')::date loop
      segment_start := greatest(assignment.starts_at, d::timestamp at time zone zone);
      segment_end := least(assignment.ends_at, (d+1)::timestamp at time zone zone);
      select range_agg(tstzrange((d::timestamp + aw.start_time) at time zone zone, (d::timestamp + aw.end_time) at time zone zone, '[)'))
        into covered from public.availability_windows aw where aw.employee_id=assignment.employee_id and aw.workspace_id=p_workspace and aw.weekday=extract(dow from d);
      if covered is null or not covered @> tstzrange(segment_start, segment_end, '[)') then raise exception 'Employee unavailable for slot %', assignment.slot_key; end if;
      if exists (select 1 from public.availability_exceptions ex where ex.workspace_id=p_workspace and ex.employee_id=assignment.employee_id and ex.local_date=d
        and tstzrange((d::timestamp + coalesce(ex.start_time,'00:00'::time)) at time zone zone,
          (d::timestamp + coalesce(ex.end_time,'24:00'::time)) at time zone zone,'[)') && tstzrange(segment_start,segment_end,'[)'))
        then raise exception 'Employee absent for slot %', assignment.slot_key; end if;
    end loop;
    if exists (select 1 from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id and other.id<>assignment.id
      and other.starts_at < assignment.ends_at + min_rest and other.ends_at > assignment.starts_at - min_rest)
      then raise exception 'Overlap or minimum rest for slot %', assignment.slot_key; end if;
    for d in select generate_series((assignment.starts_at at time zone zone)::date, ((assignment.ends_at - interval '1 microsecond') at time zone zone)::date, interval '1 day')::date loop
      if (select coalesce(sum(extract(epoch from least(other.ends_at,(d+1)::timestamp at time zone zone)-greatest(other.starts_at,d::timestamp at time zone zone))/3600),0)
        from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id and other.ends_at>d::timestamp at time zone zone and other.starts_at<(d+1)::timestamp at time zone zone) > max_day
      then raise exception 'Daily hour limit for slot %', assignment.slot_key; end if;
      monday_date := d - (extract(isodow from d)::integer - 1);
      if (select coalesce(sum(extract(epoch from least(other.ends_at,(monday_date+7)::timestamp at time zone zone)-greatest(other.starts_at,monday_date::timestamp at time zone zone))/3600),0)
        from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id
        and other.ends_at>monday_date::timestamp at time zone zone and other.starts_at<(monday_date+7)::timestamp at time zone zone) > max_week
        then raise exception 'Weekly hour limit for slot %', assignment.slot_key; end if;
    end loop;
  end loop;
end $$;

create function public.save_schedule(p_workspace uuid, p_week_start date, p_expected_revision bigint, p_expected_setup_revision bigint, p_operation_id uuid, p_operation text, p_slots jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare wk public.schedule_weeks%rowtype; zone text; s record; shift_start timestamp; shift_end timestamp; expected_count integer; actual_count integer; receipt bigint;
begin
  if auth.uid() is null or not exists (select 1 from public.workspaces where id=p_workspace and owner_user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
  if extract(isodow from p_week_start)<>1 or jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)>5000 then raise exception 'Invalid week or slots'; end if;
  perform 1 from public.workspaces where id=p_workspace for update;
  select revision into receipt from public.operation_receipts where workspace_id=p_workspace and operation_id=p_operation_id;
  if found then return receipt; end if;
  select timezone into zone from public.workspaces where id=p_workspace and setup_revision=p_expected_setup_revision;
  if zone is null then raise exception 'Setup changed; reload and generate again' using errcode='40001'; end if;
  insert into public.schedule_weeks(workspace_id,week_start,setup_revision) values (p_workspace,p_week_start,p_expected_setup_revision)
    on conflict (workspace_id,week_start) do nothing;
  select * into wk from public.schedule_weeks where workspace_id=p_workspace and week_start=p_week_start for update;
  if wk.revision<>p_expected_revision then raise exception 'Schedule changed; reload before saving' using errcode='40001'; end if;
  if exists (select 1 from public.assignments old left join jsonb_to_recordset(p_slots) as incoming(id text, employee_id uuid, locked boolean) on incoming.id=old.slot_key
    where old.week_id=wk.id and old.locked and (incoming.id is null or old.employee_id is distinct from incoming.employee_id or incoming.locked is distinct from true))
    then raise exception 'Unlock assignments before changing them'; end if;
  delete from public.assignments where week_id=wk.id;
  for s in select * from jsonb_to_recordset(p_slots) as x(id text, local_date date, role_id uuid, shift_id uuid, position smallint, employee_id uuid, locked boolean) loop
    if s.local_date<p_week_start or s.local_date>=p_week_start+7 or s.position<0 then raise exception 'Slot outside week'; end if;
    select s.local_date::timestamp+t.start_time, s.local_date::timestamp+t.end_time + case when t.end_time<=t.start_time then interval '1 day' else interval '0' end
      into shift_start, shift_end from public.shift_templates t where t.id=s.shift_id and t.workspace_id=p_workspace;
    if shift_start is null then raise exception 'Unknown shift'; end if;
    if s.id<>s.local_date::text || ':' || (select r.id::text from public.staffing_requirements r where r.workspace_id=p_workspace and r.role_id=s.role_id and r.shift_template_id=s.shift_id
      and (r.local_date=s.local_date or r.weekday=extract(dow from s.local_date) and r.local_date is null and not exists
        (select 1 from public.staffing_requirements override where override.workspace_id=p_workspace and override.local_date=s.local_date and override.role_id=r.role_id and override.shift_template_id=r.shift_template_id)) limit 1) || ':' || s.position::text then raise exception 'Invalid slot key'; end if;
    if (shift_start at time zone zone) at time zone zone <> shift_start or (shift_end at time zone zone) at time zone zone <> shift_end then raise exception 'Nonexistent local time'; end if;
    insert into public.assignments(workspace_id,week_id,slot_key,local_date,role_id,shift_template_id,position,starts_at,ends_at,employee_id,locked)
      values(p_workspace,wk.id,s.id,s.local_date,s.role_id,s.shift_id,s.position,shift_start at time zone zone,shift_end at time zone zone,s.employee_id,coalesce(s.locked,false));
  end loop;
  select coalesce(sum(required_count),0) into expected_count from public.staffing_requirements r join generate_series(p_week_start,p_week_start+6,interval '1 day') day on
    (r.local_date=day::date or r.local_date is null and r.weekday=extract(dow from day) and not exists
      (select 1 from public.staffing_requirements override where override.workspace_id=p_workspace and override.local_date=day::date and override.role_id=r.role_id and override.shift_template_id=r.shift_template_id)) where r.workspace_id=p_workspace;
  select count(*) into actual_count from public.assignments where week_id=wk.id;
  if expected_count<>actual_count or exists (select 1 from public.assignments a where a.week_id=wk.id and a.position>=
    (select r.required_count from public.staffing_requirements r where r.workspace_id=p_workspace and r.role_id=a.role_id and r.shift_template_id=a.shift_template_id
      and (r.local_date=a.local_date or r.local_date is null and r.weekday=extract(dow from a.local_date) and not exists
        (select 1 from public.staffing_requirements override where override.workspace_id=p_workspace and override.local_date=a.local_date and override.role_id=r.role_id and override.shift_template_id=r.shift_template_id)) limit 1))
    then raise exception 'Slots do not match staffing demand'; end if;
  perform public.assert_schedule_valid(p_workspace,wk.id);
  update public.schedule_weeks set revision=revision+1, setup_revision=p_expected_setup_revision where id=wk.id returning revision into receipt;
  insert into public.change_events(workspace_id,week_id,actor_id,revision,operation) values(p_workspace,wk.id,auth.uid(),receipt,left(p_operation,40));
  insert into public.operation_receipts(workspace_id,operation_id,week_id,revision) values(p_workspace,p_operation_id,wk.id,receipt);
  return receipt;
end $$;

create function public.publish_schedule(p_workspace uuid, p_week_start date, p_expected_revision bigint) returns bigint language plpgsql security definer set search_path = '' as $$
declare wk public.schedule_weeks%rowtype; snap jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.workspaces where id=p_workspace and owner_user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into wk from public.schedule_weeks where workspace_id=p_workspace and week_start=p_week_start for update;
  if wk.id is null or wk.revision<>p_expected_revision then raise exception 'Schedule changed; reload before publishing' using errcode='40001'; end if;
  if wk.setup_revision<>(select setup_revision from public.workspaces where id=p_workspace) then raise exception 'Setup changed; regenerate before publishing' using errcode='40001'; end if;
  if exists (select 1 from public.assignments where week_id=wk.id and employee_id is null) then raise exception 'Incomplete schedule cannot be published'; end if;
  perform public.assert_schedule_valid(p_workspace,wk.id);
  select coalesce(jsonb_agg(jsonb_build_object('date',a.local_date,'start',a.starts_at,'end',a.ends_at,'employee',e.display_name,'role',r.name) order by a.starts_at,a.slot_key),'[]'::jsonb)
    into snap from public.assignments a join public.employees e on e.id=a.employee_id join public.roles r on r.id=a.role_id where a.week_id=wk.id;
  insert into public.published_revisions(workspace_id,week_id,revision,snapshot) values(p_workspace,wk.id,wk.revision,snap) on conflict (week_id,revision) do nothing;
  update public.schedule_weeks set published_revision=wk.revision where id=wk.id;
  insert into public.change_events(workspace_id,week_id,actor_id,revision,operation) values(p_workspace,wk.id,auth.uid(),wk.revision,'publish');
  return wk.revision;
end $$;

create function public.create_team_link(p_workspace uuid, p_token text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.workspaces where id=p_workspace and owner_user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_token !~ '^[0-9a-f]{64}$' then raise exception 'Invalid team token'; end if;
  insert into public.team_links(workspace_id,token_hash) values(p_workspace,encode(sha256(convert_to(p_token,'UTF8')),'hex'))
    on conflict (workspace_id) do update set token_hash=excluded.token_hash, active=true, created_at=now() where not public.team_links.active;
  if not found and not exists (select 1 from public.team_links where workspace_id=p_workspace and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and active) then
    raise exception 'A team link already exists; rotate it deliberately to replace it';
  end if;
end $$;
create function public.rotate_team_link(p_workspace uuid, p_token text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.workspaces where id=p_workspace and owner_user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_token !~ '^[0-9a-f]{64}$' then raise exception 'Invalid team token'; end if;
  insert into public.team_links(workspace_id,token_hash) values(p_workspace,encode(sha256(convert_to(p_token,'UTF8')),'hex'))
    on conflict (workspace_id) do update set token_hash=excluded.token_hash, active=true, created_at=now();
end $$;
create function public.revoke_team_link(p_workspace uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.workspaces where id=p_workspace and owner_user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
  update public.team_links set active=false where workspace_id=p_workspace;
end $$;
create function public.read_team_week(p_token text, p_week_start date) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_token !~ '^[0-9a-f]{64}$' or extract(isodow from p_week_start)<>1 then return null; end if;
  select jsonb_build_object('weekStart',s.week_start,'timezone',w.timezone,'assignments',p.snapshot,'publishedAt',p.published_at)
    into result from public.team_links l join public.workspaces w on w.id=l.workspace_id join public.schedule_weeks s on s.workspace_id=l.workspace_id
    join public.published_revisions p on p.week_id=s.id and p.revision=s.published_revision
    where l.active and l.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and s.week_start=p_week_start;
  return result;
end $$;
revoke all on function public.assert_schedule_valid(uuid,uuid), public.save_schedule(uuid,date,bigint,bigint,uuid,text,jsonb), public.publish_schedule(uuid,date,bigint), public.create_team_link(uuid,text), public.rotate_team_link(uuid,text), public.revoke_team_link(uuid), public.read_team_week(text,date) from public, anon, authenticated;
grant execute on function public.save_schedule(uuid,date,bigint,bigint,uuid,text,jsonb), public.publish_schedule(uuid,date,bigint), public.create_team_link(uuid,text), public.rotate_team_link(uuid,text), public.revoke_team_link(uuid) to authenticated;
grant execute on function public.read_team_week(text,date) to anon, authenticated;
