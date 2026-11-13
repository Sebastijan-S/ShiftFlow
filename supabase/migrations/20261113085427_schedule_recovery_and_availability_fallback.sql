-- Preserve tenant boundaries, manual override semantics and the existing RPC signature.
-- Availability is optional only in the explicit automatic fallback mode.
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
    where a.week_id=p_week and a.employee_id is not null and (e.id is null or not e.active)) then raise exception 'Inactive or missing employee'; end if;
  for assignment in select * from public.assignments where week_id=p_week and employee_id is not null and not cancelled loop
    if pg_catalog.current_setting('shiftflow.allow_availability_override',true) is distinct from 'on' then
    -- Cover every local-day segment, including overnight assignments.
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
    end if;
    if exists (select 1 from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id and other.id<>assignment.id and not other.cancelled
      and other.starts_at < assignment.ends_at and other.ends_at > assignment.starts_at)
      then raise exception 'Overlap for slot %', assignment.slot_key; end if;
    if coalesce(nullif(pg_catalog.current_setting('shiftflow.enforce_rules',true),''),'on')='on' and exists
      (select 1 from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id and other.id<>assignment.id and not other.cancelled
        and other.starts_at < assignment.ends_at + min_rest and other.ends_at > assignment.starts_at - min_rest)
      then raise exception 'Minimum rest for slot %', assignment.slot_key; end if;
    for d in select generate_series((assignment.starts_at at time zone zone)::date, ((assignment.ends_at - interval '1 microsecond') at time zone zone)::date, interval '1 day')::date loop
      if (select coalesce(sum(extract(epoch from least(other.ends_at,(d+1)::timestamp at time zone zone)-greatest(other.starts_at,d::timestamp at time zone zone))/3600),0)
        from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id and not other.cancelled and other.ends_at>d::timestamp at time zone zone and other.starts_at<(d+1)::timestamp at time zone zone) > max_day
      then raise exception 'Daily hour limit for slot %', assignment.slot_key; end if;
      monday_date := d - (extract(isodow from d)::integer - 1);
      if (select coalesce(sum(extract(epoch from least(other.ends_at,(monday_date+7)::timestamp at time zone zone)-greatest(other.starts_at,monday_date::timestamp at time zone zone))/3600),0)
        from public.assignments other where other.workspace_id=p_workspace and other.employee_id=assignment.employee_id and not other.cancelled
        and other.ends_at>monday_date::timestamp at time zone zone and other.starts_at<(monday_date+7)::timestamp at time zone zone) > max_week
        then raise exception 'Weekly hour limit for slot %', assignment.slot_key; end if;
    end loop;
  end loop;
  end if;
end $$;

create or replace function public.save_schedule(p_workspace uuid, p_week_start date, p_expected_revision bigint, p_expected_setup_revision bigint, p_operation_id uuid, p_operation text, p_slots jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare wk public.schedule_weeks%rowtype; zone text; s record; shift_start timestamp; shift_end timestamp; receipt bigint;
begin
  if auth.uid() is null or not exists (select 1 from public.workspaces where id=p_workspace and owner_user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_week_start is null or p_slots is null or extract(isodow from p_week_start)<>1 or jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)>5000 then raise exception 'Invalid week or slots'; end if;
  if p_operation is null or p_operation not in ('generate','generate_availability_override','replace','swap','drag_move_or_swap','lock','unlock','cancel_shift','restore_shift','undo') then raise exception 'Invalid schedule operation'; end if;
  if p_operation_id is null then raise exception 'Operation ID required'; end if;
  perform 1 from public.workspaces where id=p_workspace for update;
  select revision into receipt from public.operation_receipts where workspace_id=p_workspace and operation_id=p_operation_id;
  if found then return receipt; end if;
  select timezone into zone from public.workspaces where id=p_workspace and setup_revision=p_expected_setup_revision;
  if zone is null then raise exception 'Setup changed; reload and generate again' using errcode='40001'; end if;
  insert into public.schedule_weeks(workspace_id,week_start,setup_revision) values (p_workspace,p_week_start,p_expected_setup_revision)
    on conflict (workspace_id,week_start) do nothing;
  select * into wk from public.schedule_weeks where workspace_id=p_workspace and week_start=p_week_start for update;
  if wk.revision<>p_expected_revision then raise exception 'Schedule changed; reload before saving' using errcode='40001'; end if;
  -- Compare the complete expected set; NULL, invented references and duplicates cannot
  -- pass by preserving only the total number of rows. Date-specific demand wins.
  if exists (
    with expected as (
      select day::date as local_date, r.role_id, r.shift_template_id as shift_id, pos as position,
        day::date::text || ':' || r.id::text || ':' || pos::text as id
      from public.staffing_requirements r
      cross join generate_series(p_week_start,p_week_start+6,interval '1 day') day
      cross join lateral generate_series(0,r.required_count-1) pos
      where r.workspace_id=p_workspace and (r.local_date=day::date or
        r.local_date is null and r.weekday=extract(dow from day) and not exists (
          select 1 from public.staffing_requirements override where override.workspace_id=p_workspace
          and override.local_date=day::date and override.role_id=r.role_id and override.shift_template_id=r.shift_template_id))
    ), incoming as (
      select local_date,role_id,shift_id,position,id from jsonb_to_recordset(p_slots) as x(id text,local_date date,role_id uuid,shift_id uuid,position integer)
    ), differences as (
      (select * from expected except all select * from incoming)
      union all
      (select * from incoming except all select * from expected)
    ) select 1 from differences
  ) then raise exception 'Slots do not match staffing demand'; end if;
  -- A locked assignment can change only its lock flag, via explicit unlock or undo.
  -- Compare saved instants too: changed templates must not silently move locked work.
  if exists (
    select 1 from public.assignments old
    left join jsonb_to_recordset(p_slots) as x(id text,local_date date,role_id uuid,shift_id uuid,position integer,employee_id uuid,locked boolean,cancelled boolean) on x.id=old.slot_key
    left join public.shift_templates t on t.id=x.shift_id and t.workspace_id=p_workspace
    where old.week_id=wk.id and old.locked and (
      x.id is null or old.employee_id is distinct from x.employee_id or old.local_date is distinct from x.local_date
      or old.role_id is distinct from x.role_id or old.shift_template_id is distinct from x.shift_id
      or old.position is distinct from x.position or old.cancelled is distinct from coalesce(x.cancelled,false)
      or x.locked is null or (not x.locked and p_operation not in ('unlock','undo'))
      or old.starts_at is distinct from ((x.local_date::timestamp+t.start_time) at time zone zone)
      or old.ends_at is distinct from ((x.local_date::timestamp+t.end_time+case when t.end_time<=t.start_time then interval '1 day' else interval '0' end) at time zone zone)
    )
  ) then raise exception 'Unlock assignments before changing them'; end if;
  -- Calling an operation unlock/lock cannot hide an unrelated assignment change.
  if p_operation in ('unlock','lock') and exists (
    select 1 from public.assignments old full join
      jsonb_to_recordset(p_slots) as x(id text,local_date date,role_id uuid,shift_id uuid,position integer,employee_id uuid,cancelled boolean)
      on old.week_id=wk.id and x.id=old.slot_key
    where (old.week_id=wk.id or old.week_id is null) and (
      old.slot_key is null or x.id is null or old.employee_id is distinct from x.employee_id
      or old.local_date is distinct from x.local_date or old.role_id is distinct from x.role_id
      or old.shift_template_id is distinct from x.shift_id or old.position is distinct from x.position
      or old.cancelled is distinct from coalesce(x.cancelled,false))
  ) then raise exception 'Lock operation may only change lock flags'; end if;
  delete from public.assignments a where a.week_id=wk.id and not exists (
    select 1 from jsonb_array_elements(p_slots) x where x->>'id'=a.slot_key);
  for s in select * from jsonb_to_recordset(p_slots) as x(id text, local_date date, role_id uuid, shift_id uuid, position smallint, employee_id uuid, locked boolean, cancelled boolean) loop
    if coalesce(s.cancelled,false) and (s.employee_id is not null or coalesce(s.locked,false)) then raise exception 'Cancelled slot must be empty and unlocked'; end if;
    if s.local_date<p_week_start or s.local_date>=p_week_start+7 or s.position<0 then raise exception 'Slot outside week'; end if;
    select s.local_date::timestamp+t.start_time, s.local_date::timestamp+t.end_time + case when t.end_time<=t.start_time then interval '1 day' else interval '0' end
      into shift_start, shift_end from public.shift_templates t where t.id=s.shift_id and t.workspace_id=p_workspace;
    if shift_start is null then raise exception 'Unknown shift'; end if;
    if (shift_start at time zone zone) at time zone zone <> shift_start or (shift_end at time zone zone) at time zone zone <> shift_end then raise exception 'Nonexistent local time'; end if;
    insert into public.assignments(workspace_id,week_id,slot_key,local_date,role_id,shift_template_id,position,starts_at,ends_at,employee_id,locked,cancelled)
      values(p_workspace,wk.id,s.id,s.local_date,s.role_id,s.shift_id,s.position,shift_start at time zone zone,shift_end at time zone zone,s.employee_id,coalesce(s.locked,false),coalesce(s.cancelled,false))
      on conflict (week_id,slot_key) do update set local_date=excluded.local_date, role_id=excluded.role_id,
        shift_template_id=excluded.shift_template_id, position=excluded.position, starts_at=excluded.starts_at,
        ends_at=excluded.ends_at, employee_id=excluded.employee_id, locked=excluded.locked, cancelled=excluded.cancelled;
  end loop;
  perform pg_catalog.set_config('shiftflow.enforce_rules', case when p_operation in ('generate','generate_availability_override') then 'on' else 'off' end, true);
  perform pg_catalog.set_config('shiftflow.allow_availability_override', case when p_operation='generate_availability_override' then 'on' else 'off' end, true);
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
    into snap from public.assignments a join public.employees e on e.id=a.employee_id join public.roles r on r.id=a.role_id where a.week_id=wk.id and not a.cancelled;
  insert into public.published_revisions(workspace_id,week_id,revision,snapshot) values(p_workspace,wk.id,wk.revision,snap) on conflict (week_id,revision) do nothing;
  update public.schedule_weeks set published_revision=wk.revision where id=wk.id;
  insert into public.change_events(workspace_id,week_id,actor_id,revision,operation) values(p_workspace,wk.id,auth.uid(),wk.revision,'publish');
  return wk.revision;
end $$;

-- CREATE OR REPLACE retains existing grants; make the intended API boundary explicit.
revoke all on function public.assert_schedule_valid(uuid,uuid) from public,anon,authenticated;
revoke all on function public.save_schedule(uuid,date,bigint,bigint,uuid,text,jsonb) from public,anon;
grant execute on function public.save_schedule(uuid,date,bigint,bigint,uuid,text,jsonb) to authenticated;
