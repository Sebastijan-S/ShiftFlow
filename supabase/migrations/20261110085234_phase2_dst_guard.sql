-- The browser rejects ambiguous local shift boundaries; enforce the same rule on trusted writes.
create function public.reject_ambiguous_assignment_time() returns trigger language plpgsql security definer set search_path = '' as $$
declare zone text; delta integer; local_start timestamp; local_end timestamp;
begin
  select timezone into zone from public.workspaces where id=new.workspace_id;
  if zone is null then raise exception 'Unknown workspace timezone'; end if;
  local_start := new.starts_at at time zone zone;
  local_end := new.ends_at at time zone zone;
  for delta in -8..8 loop
    if delta<>0 and (
      ((new.starts_at + make_interval(mins=>delta*15)) at time zone zone)=local_start or
      ((new.ends_at + make_interval(mins=>delta*15)) at time zone zone)=local_end
    ) then raise exception 'Ambiguous local shift time'; end if;
  end loop;
  return new;
end $$;
create trigger reject_ambiguous_time before insert or update of starts_at, ends_at on public.assignments
  for each row execute function public.reject_ambiguous_assignment_time();
revoke all on function public.reject_ambiguous_assignment_time() from public, anon, authenticated;
