-- Phase 1 schema. Promoted to a CLI-generated migration after isolated replay.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  timezone text not null default 'Europe/Belgrade' check (length(timezone) between 3 and 80),
  created_at timestamptz not null default now(),
  unique (id, owner_user_id)
);
create table public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role = 'owner'),
  primary key (workspace_id, user_id)
);
create function public.create_owner_membership() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.memberships(workspace_id, user_id) values (new.id, new.owner_user_id);
  insert into public.scheduling_rules(workspace_id) values (new.id);
  return new;
end $$;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  unique (id, workspace_id), unique (workspace_id, name)
);
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  active boolean not null default true,
  target_hours numeric(5,2) not null default 40 check (target_hours between 0 and 168),
  preference text not null default 'none' check (preference in ('none','early','late')),
  unique (id, workspace_id)
);
create table public.employee_roles (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  employee_id uuid not null,
  role_id uuid not null,
  primary key (employee_id, role_id),
  foreign key (employee_id, workspace_id) references public.employees(id, workspace_id) on delete cascade,
  foreign key (role_id, workspace_id) references public.roles(id, workspace_id) on delete cascade
);
create table public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  start_time time not null,
  end_time time not null,
  unique (id, workspace_id), unique (workspace_id, name),
  check (start_time <> end_time)
);
create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  employee_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time),
  foreign key (employee_id, workspace_id) references public.employees(id, workspace_id) on delete cascade
);
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  employee_id uuid not null,
  local_date date not null,
  start_time time,
  end_time time,
  reason text check (length(reason) <= 500),
  check ((start_time is null and end_time is null) or (start_time is not null and end_time is not null and start_time < end_time)),
  foreign key (employee_id, workspace_id) references public.employees(id, workspace_id) on delete cascade
);
create table public.staffing_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  role_id uuid not null,
  shift_template_id uuid not null,
  weekday smallint check (weekday between 0 and 6),
  local_date date,
  required_count smallint not null check (required_count between 0 and 100),
  check ((weekday is null) <> (local_date is null)),
  foreign key (role_id, workspace_id) references public.roles(id, workspace_id) on delete cascade,
  foreign key (shift_template_id, workspace_id) references public.shift_templates(id, workspace_id) on delete cascade
);
create unique index staffing_weekday_unique on public.staffing_requirements(workspace_id, role_id, shift_template_id, weekday) where weekday is not null;
create unique index staffing_date_unique on public.staffing_requirements(workspace_id, role_id, shift_template_id, local_date) where local_date is not null;
create table public.scheduling_rules (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  max_weekly_hours numeric(5,2) not null default 48 check (max_weekly_hours between 1 and 168),
  min_rest_hours numeric(4,2) not null default 11 check (min_rest_hours between 0 and 24),
  max_daily_hours numeric(4,2) not null default 12 check (max_daily_hours between 1 and 24)
);
create trigger workspace_owner_setup after insert on public.workspaces for each row execute function public.create_owner_membership();

create index employee_workspace_idx on public.employees(workspace_id);
create index availability_employee_day_idx on public.availability_windows(employee_id, weekday);
create index absence_employee_date_idx on public.availability_exceptions(employee_id, local_date);
create index staffing_workspace_day_idx on public.staffing_requirements(workspace_id, weekday, local_date);

alter table public.workspaces enable row level security;
create policy workspace_select on public.workspaces for select to authenticated using (owner_user_id = (select auth.uid()));
create policy workspace_insert on public.workspaces for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy workspace_update on public.workspaces for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy workspace_delete on public.workspaces for delete to authenticated using (owner_user_id = (select auth.uid()));

alter table public.memberships enable row level security;
create policy membership_select on public.memberships for select to authenticated using (user_id = (select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['roles','employees','employee_roles','shift_templates','availability_windows','availability_exceptions','staffing_requirements','scheduling_rules'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy tenant_select on public.%I for select to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())))',t);
    execute format('create policy tenant_insert on public.%I for insert to authenticated with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())))',t);
    execute format('create policy tenant_update on public.%I for update to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())))',t);
    execute format('create policy tenant_delete on public.%I for delete to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())))',t);
  end loop;
end $$;

revoke all on function public.create_owner_membership() from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workspaces, public.roles, public.employees, public.employee_roles, public.shift_templates, public.availability_windows, public.availability_exceptions, public.staffing_requirements, public.scheduling_rules to authenticated;
grant select on public.memberships to authenticated;
