-- Automatic generation enforces scheduling rules. Manual edits and publication keep tenant, slot and relational integrity.
create or replace function public.assert_schedule_valid(p_workspace uuid, p_week uuid) returns void language plpgsql security definer set search_path = '' as $$
declare assignment record; d date; monday_date date; segment_start timestamptz; segment_end timestamptz; covered tstzmultirange; max_week numeric; max_day numeric; min_rest interval; zone text;
begin
  select w.timezone, r.max_weekly_hours, r.max_daily_hours, make_interval(secs => r.min_rest_hours * 3600)
  into zone, max_week, max_day, min_rest from public.workspaces w join public.scheduling_rules r on r.workspace_id=w.id where w.id=p_workspace;
  if zone is null then raise exception 'Workspace rules missing'; end if;
  if exists (select 1 from public.assignments a join public.schedule_weeks sw on sw.id=a.week_id
    where a.week_id=p_week and (a.local_date < sw.week_start or a.local_date >= sw.week_start+7)) then raise exception 'Slot outside week'; end if;
  if coalesce(nullif(pg_catalog.current_setting('shiftflow.enforce_rules',true),''),'on')='on' then
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
      and other.starts_at < assignment.ends_at and other.ends_at > assignment.starts_at)
      then raise exception 'Overlap for slot %', assignment.slot_key; end if;
    if coalesce(nullif(pg_catalog.current_setting('shiftflow.enforce_rules',true),''),'on')='on' and exists
      (select 1 from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id and other.id<>assignment.id
        and other.starts_at < assignment.ends_at + min_rest and other.ends_at > assignment.starts_at - min_rest)
      then raise exception 'Minimum rest for slot %', assignment.slot_key; end if;
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
  end if;
end $$;

create or replace function public.save_schedule(p_workspace uuid, p_week_start date, p_expected_revision bigint, p_expected_setup_revision bigint, p_operation_id uuid, p_operation text, p_slots jsonb)
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
  for s in select * from jsonb_to_recordset(p_slots) as x(id text, local_date date, role_id uuid, shift_id uuid, position smallint, employee_id uuid, locked boolean, cancelled boolean) loop
    if s.local_date<p_week_start or s.local_date>=p_week_start+7 or s.position<0 then raise exception 'Slot outside week'; end if;
    select s.local_date::timestamp+t.start_time, s.local_date::timestamp+t.end_time + case when t.end_time<=t.start_time then interval '1 day' else interval '0' end
      into shift_start, shift_end from public.shift_templates t where t.id=s.shift_id and t.workspace_id=p_workspace;
    if shift_start is null then raise exception 'Unknown shift'; end if;
    if s.id<>s.local_date::text || ':' || (select r.id::text from public.staffing_requirements r where r.workspace_id=p_workspace and r.role_id=s.role_id and r.shift_template_id=s.shift_id
      and (r.local_date=s.local_date or r.weekday=extract(dow from s.local_date) and r.local_date is null and not exists
        (select 1 from public.staffing_requirements override where override.workspace_id=p_workspace and override.local_date=s.local_date and override.role_id=r.role_id and override.shift_template_id=r.shift_template_id)) limit 1) || ':' || s.position::text then raise exception 'Invalid slot key'; end if;
    if (shift_start at time zone zone) at time zone zone <> shift_start or (shift_end at time zone zone) at time zone zone <> shift_end then raise exception 'Nonexistent local time'; end if;
    insert into public.assignments(workspace_id,week_id,slot_key,local_date,role_id,shift_template_id,position,starts_at,ends_at,employee_id,locked,cancelled)
      values(p_workspace,wk.id,s.id,s.local_date,s.role_id,s.shift_id,s.position,shift_start at time zone zone,shift_end at time zone zone,s.employee_id,coalesce(s.locked,false),coalesce(s.cancelled,false));
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
  perform pg_catalog.set_config('shiftflow.enforce_rules', case when p_operation='generate' then 'on' else 'off' end, true);
  perform public.assert_schedule_valid(p_workspace,wk.id);
  update public.schedule_weeks set revision=revision+1, setup_revision=p_expected_setup_revision where id=wk.id returning revision into receipt;
  insert into public.change_events(workspace_id,week_id,actor_id,revision,operation) values(p_workspace,wk.id,auth.uid(),receipt,left(p_operation,40));
  insert into public.operation_receipts(workspace_id,operation_id,week_id,revision) values(p_workspace,p_operation_id,wk.id,receipt);
  return receipt;
end $$;

create or replace function public.publish_schedule(p_workspace uuid, p_week_start date, p_expected_revision bigint) returns bigint language plpgsql security definer set search_path = '' as $$
declare wk public.schedule_weeks%rowtype; snap jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.workspaces where id=p_workspace and owner_user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into wk from public.schedule_weeks where workspace_id=p_workspace and week_start=p_week_start for update;
  if wk.id is null or wk.revision<>p_expected_revision then raise exception 'Schedule changed; reload before publishing' using errcode='40001'; end if;
  if wk.setup_revision<>(select setup_revision from public.workspaces where id=p_workspace) then raise exception 'Setup changed; regenerate before publishing' using errcode='40001'; end if;
  if exists (select 1 from public.assignments where week_id=wk.id and employee_id is null and not cancelled) then raise exception 'Incomplete schedule cannot be published'; end if;
  perform pg_catalog.set_config('shiftflow.enforce_rules','off',true);
  perform public.assert_schedule_valid(p_workspace,wk.id);
  select coalesce(jsonb_agg(jsonb_build_object('date',a.local_date,'start',a.starts_at,'end',a.ends_at,'employee',e.display_name,'role',r.name) order by a.starts_at,a.slot_key),'[]'::jsonb)
    into snap from public.assignments a join public.employees e on e.id=a.employee_id join public.roles r on r.id=a.role_id where a.week_id=wk.id;
  insert into public.published_revisions(workspace_id,week_id,revision,snapshot) values(p_workspace,wk.id,wk.revision,snap) on conflict (week_id,revision) do nothing;
  update public.schedule_weeks set published_revision=wk.revision where id=wk.id;
  insert into public.change_events(workspace_id,week_id,actor_id,revision,operation) values(p_workspace,wk.id,auth.uid(),wk.revision,'publish');
  return wk.revision;
end $$;
