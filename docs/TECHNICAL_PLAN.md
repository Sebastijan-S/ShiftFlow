# Database-first technical plan

> Current scheduling rules and verified fixes: [13 November status](SCHEDULE_RECOVERY_STATUS.md). Availability may be overridden only in the automatic fallback; overlap, rest, hours, active tenant employees, locks and exact demand remain mandatory. Roles are labels; manual override semantics remain as agreed. This newer decision supersedes conflicting planning text below.

## Phase 1 implementation note (9 November 2026)

The normalized setup subset is now implemented by migrations `20261109223308_phase1_foundation.sql`, `20261109223647_phase1_foreign_key_indexes.sql`, and `20261109224326_phase1_protect_staffing_references.sql` in project `srpvabzbekenbuxxrbvr`. Each pilot account owns one workspace, enforced by `workspaces.owner_user_id unique`; an insert trigger atomically creates the owner membership and default scheduling rules. All ten public tables have RLS. Tenant-owned child tables use workspace-scoped foreign keys; anonymous callers have no application table grants. Phase 2 schedule, publication, audit, and share tables are intentionally not present yet. Browser access uses a publishable key and generated database types.

The isolated schema suite replays all three migrations and checks owner bootstrap, duplicate prevention, tenant reads/writes and foreign keys, invalid intervals/counts, protected staffing references, and anonymous denial. Hosted anonymous REST read/write checks passed. Hosted Auth and two-identity setup round trips are still pending because the project currently has email confirmation enabled and phone signups disabled.

This is a schema/behavior contract, not an applied migration. Reinspect the project before implementation.

## Stack and code boundaries

Next.js App Router with strict TypeScript, TSX React components, Tailwind/shadcn, pnpm and a lockfile. Use official Supabase clients with separate browser/server access; cookie-based SSR uses the appropriate SSR package and verified server identity. Follow current [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Next.js setup guidance](https://nextjs.org/docs/app/getting-started/installation). Recheck API versions when implementing.

Suggested modules: app routes/layouts; features for scheduling/team/availability/settings; components/ui; lib/scheduling for pure constraints/search; lib/supabase for typed clients/access; supabase/migrations; tests for domain/database/browser behavior. Avoid a separate backend service or ORM until justified.

Authenticated scheduling uses PostgreSQL as its source of truth. Local pending changes are explicitly unsaved, never a competing authoritative workspace JSON. Published snapshots are an intentional immutable projection with a clear publication boundary.

## Proposed relational model

| Entity | Purpose and essential invariants |
| --- | --- |
| auth.users | Supabase-managed identity/passwords; never duplicate password storage |
| workspaces | Business name, IANA timezone, settings; owner setup is atomic |
| memberships | Auth user/workspace relationship; unique membership; no user-editable role escalation |
| employees | Workspace, display name, active status, target hours, preferences; no account required |
| roles / employee_roles | Workspace-defined labels and eligibility; composite tenant foreign keys |
| shift_templates | Role-independent named time windows, explicit overnight handling |
| availability_windows | Employee recurring weekday/time windows in workspace timezone |
| availability_exceptions | Employee date/time unavailable intervals; end after start; optional private reason |
| staffing_requirements | Required count by day/date, template and role; nonnegative bounded counts |
| scheduling_rules | Workspace hard limits and explicit soft preferences, typed constraints |
| schedule_weeks | Workspace/week start, draft revision, published revision pointer |
| assignments | Week, slot time, employee, role, locked flag, private note; tenant-safe references |
| published_revisions | Immutable safe snapshot per week/revision; publication timestamp |
| team_links | Workspace token hash, active/revoked state; stable across weekly publishing |
| change_events | Actor, operation, revision, timestamp and required recovery details, private |
| operation_receipts | Idempotency for retried logical writes; unique operation ID per workspace |

Use immutable IDs, UTC audit timestamps, explicit local calendar dates, and workspace timezone. Store assignment instants or an equally unambiguous interval representation; pin assigned times so editing a future template does not rewrite historical shifts. Test DST ambiguous/nonexistent times and overnight intervals. Interval comparisons use half-open [start,end) semantics; a shift ending at an absence start is allowed.

Normalize weekly availability and exceptions into allowed intervals before scheduling. The strict first pass requires the whole shift to fit; the automatic fallback may violate availability with warnings while preserving every other automatic constraint. Date exceptions can remove part/all of a recurring window. Changing availability must flag conflicting draft assignments rather than silently deleting them.

All tenant-owned foreign keys include workspace identity or enforce the equivalent relational invariant. Employee eligibility and temporal constraints require trusted transactional validation as well as UI feedback. Index common workspace/week and employee/interval queries, membership lookups, and token hashes. Add uniqueness and check constraints where they express the invariant directly.

## Authentication contract

Email OR phone + password, no signup confirmation for the pilot. Supabase supports both identifiers; enable required providers and configure confirmation settings deliberately. [Password Auth documentation](https://supabase.com/docs/guides/auth/passwords).

Use a country selector and normalized E.164 phones, generic login errors, no account enumeration, and the provider's rate protections. An unverified contact value never grants business membership. Create the business and owner membership exactly once through a trusted transaction; retrying signup/bootstrap must not create duplicate workspaces.

Authorization uses authenticated user identity plus database membership. Do not trust a client-supplied workspace ID or user metadata role. Logout must clear workspace state; switching accounts must not reuse another business's cached data.

Store NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in local/deployment environment configuration. Commit only placeholders. Never send service-role/secret keys to the browser. The supplied publishable key is not database-administration access.

Do not implement email/SMS confirmation, OTP or MFA gates in the pilot. Provider settings have not been inspected or changed in this planning step; Phase 1 must verify both real signup/login paths. Password reset/contact linking is outside this no-confirmation pilot unless explicitly added; do not provide an insecure identity-bypass recovery form.

## Transactions and concurrency

- Save draft: validate membership, expected revision, references, intervals and constraints; write changes, increment revision and append audit in one transaction.
- Generation: compute a candidate from a consistent input revision; revalidate inputs at commit. A stale input version must not overwrite subsequent availability or schedule changes.
- Swap: validate both new employee assignments against the full relevant schedule, then commit both or neither. Replacement preserves slot date/time/role.
- Publish: validate complete coverage and hard constraints server-side, create the restricted snapshot and update published pointer atomically. If it fails, the previous published revision remains visible.
- Retry: stable operation IDs prevent duplicated assignments or repeated effects when a response is lost.
- Undo: apply an inverse operation against the expected current revision; never rewind another session's changes silently.
- Conflict: retain the local proposal, offer reload/review, and reject stale overwrites. Automatic merging is deferred.

Snapshot consistency includes names, roles and times so later template changes cannot silently rewrite what was published. Keep internal notes out of the share snapshot from the start.

## RLS and shared-link boundary

Enable RLS for exposed application tables. The pilot owner can manage only their workspace. Anonymous clients cannot read business tables. Employee links use a dedicated narrowly scoped RPC/route that returns only safe published fields. Store high-entropy tokens as hashes, rate-limit token lookup where practical, and never place tokens in analytics/error logs.

If SECURITY DEFINER functions are required, use fixed search paths, explicit identity/membership checks, narrow grants, and reviewed function ownership. Avoid publicly callable generic administrative functions. Tenant isolation must hold under direct REST/RPC calls, not only UI navigation.

Shared links are read-only bearer access, not employee authentication. Publishing another week leaves the URL unchanged. Revoking it blocks future access without deleting schedules.

## Generator strategy and quality

Start with constrained demand ordering, eligible candidate sets, reproducible tie-breaking, and bounded backtracking/repair. Preserve locks. Reuse a shared constraint model across generation, manual edits, and publication checks. Use server-side generation initially with a bounded runtime suitable for the selected host; only add a worker/job architecture if measured demand requires it.

Lexicographic priorities: zero hard violations; maximum required coverage; then target-hour fairness, balanced undesirable shifts, preferences, and minimal unnecessary movement when preserving locked work. Targets are soft, maximums hard. Distinguish no feasible solution proven, no complete solution found within budget, and incomplete input.

For small fixtures compare against exhaustive enumeration to detect avoidable gaps. For representative pilot cases require all known-feasible demand filled without manual cleanup. Record metrics, not just screenshots. Proposed UX targets: typical 10/25-person weeks around 5 seconds and 50-person cases around 10 seconds; benchmark on the chosen host before accepting these as achieved. If exceeded, show honest progress/cancel and optimize; no fabricated guarantee of universal optimality.

## Database reviews throughout development

D1: Before UI integration, review schema, keys, checks, privileges and migration replay.
D2: End of Phase 1, prove both Auth paths, owner bootstrap, tenant isolation and setup round trips.
D3: End of Phase 2, test atomic generation/swap/publication, retries, stale input, share privacy and rollback.
D4: Before live pilot, rerun integrity/access checks after final migrations, inspect query plans on representative fixtures, rehearse restore, and smoke-test deployed identity/data paths.

Use an isolated database for writes/fixtures. Never reset the named production project to run tests. Run Supabase security/performance advisors after schema changes and record actionable results. Never equate successful migration execution with correct behavior.

## Release approach

Use versioned migrations, generated TypeScript types, placeholder environment documentation, and a normal Next.js production build. Vercel is a suggested host pending actual account/domain choice. Keep development/test data separate from pilot data. Prepare rollback and data-preservation instructions before launch; don't promise downgrading destructive migrations is safe.

No migration/Auth-setting change was performed during planning. Exact SQL, package versions, provider settings and deployment limits must be verified during the requested implementation phase.
