create index availability_windows_employee_workspace_fk_idx on public.availability_windows(employee_id, workspace_id);
create index availability_exceptions_employee_workspace_fk_idx on public.availability_exceptions(employee_id, workspace_id);
create index employee_roles_employee_workspace_fk_idx on public.employee_roles(employee_id, workspace_id);
create index employee_roles_role_workspace_fk_idx on public.employee_roles(role_id, workspace_id);
create index employee_roles_workspace_fk_idx on public.employee_roles(workspace_id);
create index memberships_user_fk_idx on public.memberships(user_id);
create index staffing_role_workspace_fk_idx on public.staffing_requirements(role_id, workspace_id);
create index staffing_template_workspace_fk_idx on public.staffing_requirements(shift_template_id, workspace_id);
