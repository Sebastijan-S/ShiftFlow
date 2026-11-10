alter table public.staffing_requirements
  drop constraint staffing_requirements_role_id_workspace_id_fkey,
  add constraint staffing_requirements_role_id_workspace_id_fkey
    foreign key (role_id, workspace_id) references public.roles(id, workspace_id) on delete restrict;

alter table public.staffing_requirements
  drop constraint staffing_requirements_shift_template_id_workspace_id_fkey,
  add constraint staffing_requirements_shift_template_id_workspace_id_fkey
    foreign key (shift_template_id, workspace_id) references public.shift_templates(id, workspace_id) on delete restrict;
