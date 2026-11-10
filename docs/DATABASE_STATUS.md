# Database inspection — 9 November 2026

> Historical pre-implementation snapshot. Three Phase 1 migrations were applied later on 9 November 2026; see [Phase 1 status](PHASE1_STATUS.md) for the current state.

## Verified read-only facts

Connected project: ShiftFlow.
Project reference: srpvabzbekenbuxxrbvr.
Region: eu-central-1.
Provider-reported status: ACTIVE_HEALTHY.
Provider-reported PostgreSQL engine: 17.

Three read-only checks were performed:

1. Supabase list_tables for the public schema returned an empty table list.
2. Supabase list_migrations returned an empty migration list.
3. An independent pg_class/pg_namespace query returned no ordinary or partitioned tables in public.

Catalog query:
```sql
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;
```

## Meaning and limits

The public application schema has not been created in the inspected project. Plan a fresh schema instead of assuming the old downloaded migration is installed.

This is not a claim that the entire database is empty. Auth/storage/internal schemas, users, Auth provider settings, views/functions outside this check and existing personal data were not inspected. Provider health does not prove application correctness.

No tables, policies, functions, users, migrations or Auth settings were changed. Reinspect immediately before implementation/migrations; this snapshot may become stale.

## Repeated checks required

- D1: schema/key/constraint/RLS design and isolated migration replay.
- D2: real email/phone password Auth, atomic owner creation and business isolation.
- D3: generated schedules, swaps, retries, conflicts, publication and share privacy.
- D4: final integrity/access/performance/restore review and deployed smoke test.

See [Technical plan](TECHNICAL_PLAN.md) and [Acceptance checklist](ACCEPTANCE_CHECKLIST.md). Tests must use isolated fixtures and must not reset the named project.
