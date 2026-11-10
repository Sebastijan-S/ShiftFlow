create index assignment_employee_fk_idx on public.assignments(employee_id, workspace_id);
create index assignment_role_fk_idx on public.assignments(role_id, workspace_id);
create index assignment_template_fk_idx on public.assignments(shift_template_id, workspace_id);
create index assignment_week_fk_idx on public.assignments(week_id, workspace_id);
create index change_event_week_fk_idx on public.change_events(week_id, workspace_id);
create index operation_receipt_week_fk_idx on public.operation_receipts(week_id, workspace_id);
create index published_revision_week_fk_idx on public.published_revisions(week_id, workspace_id);
