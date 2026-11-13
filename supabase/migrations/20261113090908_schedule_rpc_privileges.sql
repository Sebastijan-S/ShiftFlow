-- Hosted defaults granted ALL even though scheduling is writable only through RPCs.
-- Keep RLS and ownership policies unchanged; remove direct writes (including TRUNCATE).
revoke all on public.assignments, public.schedule_weeks, public.published_revisions,
  public.change_events, public.operation_receipts, public.team_links from public,anon,authenticated;
grant select on public.assignments, public.schedule_weeks, public.published_revisions to authenticated;
revoke all on sequence public.change_events_id_seq from public,anon,authenticated;
