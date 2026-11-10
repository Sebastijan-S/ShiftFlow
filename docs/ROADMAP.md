# Three-phase pilot roadmap

All tasks below are planned, not completed. Execute one phase at a time. A phase is complete only when its acceptance checks pass; visual completeness alone is insufficient.

## Phase 1 — Database, accounts, and business setup

**Outcome:** a manager can sign up, create a workspace, configure a team and its availability, and reload without losing data.

1. Read active instructions and inspect the incomplete reference source where useful. Recheck Supabase project identity, schemas, functions, policies, migration history, and Auth configuration without reading unrelated personal data.
2. Establish the schema contract in TECHNICAL_PLAN.md. Review tenant foreign keys, constraints, transaction boundaries, indexes, and allowed operations before building business forms.
3. Scaffold Next.js/TSX around the existing planning files. Apply preset b2fA9jiwaO with the official CLI and record its resolved settings. Create the requested light-blue tokens and accessible components.
4. Create versioned migrations and typed database access. Test migrations in an isolated database, including two businesses and anonymous access. No direct application password table.
5. Implement email/phone + password accounts without signup confirmation, refreshable sessions, logout, and atomic workspace/owner creation. Both identifier paths must work; do not quietly deliver email-only.
6. Build the responsive application shell: Schedule, Team, Availability, Settings. Keep the initial setup simple rather than adding a separate onboarding wizard.
7. Implement business/role/shift configuration, employee records, weekly availability windows, date-specific absences, partial-day exceptions, staffing requirements, and scheduling rules.
8. Make these forms genuinely persist to Supabase with validation and explicit saving/error states. Keep demo fixtures separate from real workspaces.
9. Run Phase 1 tests and database review D1/D2. Save evidence and a short phase completion report.

**Review checkpoint:** the user can inspect the light-blue UI, both login paths, and saved setup before requesting Phase 2.

## Phase 2 — Dependable generation and fast exception handling

**Outcome:** real configured data produces a usable schedule, managers can make rapid safe replacements, and employees can view the published calendar.

1. Define a single typed scheduling contract for eligibility, intervals, demand, rules, and assignments. Validate on both client and trusted write paths.
2. Build realistic known-feasible fixtures before tuning the generator: hospitality, customer service, and retail examples. Include 10-, 25-, and 50-person datasets as test scales, not product limits.
3. Implement hard-constraint checks and a bounded, reproducible search with repair/backtracking. Start with the most constrained demand. Maximize filled required positions first; improve target-hour fairness, undesirable-shift distribution, and preferences second.
4. Include adjacent weeks, overnight shifts, exact unavailability intervals, already assigned hours, and locks. Benchmark the generator against a small exhaustive oracle for tiny instances, so a greedy dead end is caught.
5. Provide progress/cancel behavior and honest outcomes. Search exhaustion is not proof that no solution exists. Preserve the old draft if generation fails or is cancelled.
6. Build the weekly grid, mobile agenda/day views, coverage and hours indicators, filters, and manual assignment validation.
7. Add drag movement/replacement, two-way swaps, cascading menus, lock/unlock, and undo. A replacement keeps the shift's time/date; swapping preserves the two slot definitions. Save each operation atomically.
8. Implement revision-checked saves, rapid-edit queuing, transactional audit records, and meaningful conflict/error messages. Never overwrite a newer schedule automatically.
9. Implement validated publication and immutable published snapshots. Create one stable team link that reads only safe published fields and offers week navigation.
10. Add print/PDF layouts and informational Basic/Premium prices.
11. Run Phase 2 acceptance tests and database review D3, including unauthorized direct requests, transaction failure, and a second session.

**Review checkpoint:** demonstrate setup -> Generate -> sickness replacement -> Publish update -> employee view at the same link. No routine manual cleanup on the known-feasible fixtures.

## Phase 3 — Pilot hardening and release

**Outcome:** an invited tester can use the deployed app independently and report problems.

1. Run the full end-to-end suite in Chrome at desktop and mobile viewport sizes; inspect light-theme calendar density, dialogs, menus, touch/keyboard alternatives, and print output.
2. Exercise real Supabase email and phone password flows without confirmation. Check reload, expired sessions, unauthorized requests, and separate business sessions.
3. Perform database review D4: schema/RLS/privilege audit, duplicate/retry safety, concurrent writes, query performance, migration reproducibility, and a backup/restore rehearsal in a disposable environment.
4. Test generation quality across all fixtures and record elapsed time, coverage, hard violations, target-hour deviation, and unresolved search cases. Tune before declaring readiness.
5. Resolve release-blocking defects. Define a minimal pilot support route and feedback template without adding third-party analytics or storing passwords/contact data in logs.
6. Prepare local startup instructions, environment names, migration order, provider configuration, launch/rollback steps, and the release commit. Inspect the destination Git history before pushing; never force-push.
7. Prepare a deployable Next.js build; confirm host/domain and settings at launch time. Do not automatically publish simply because Phase 3 was requested.
8. Once explicitly told to launch, apply only reviewed migrations, deploy, and smoke-test the live URL: both login types, generation, save/reload, replacement, publication, and team-link access.
9. Give invited testers the guide, collect feedback, and prioritize generator/data-loss issues before cosmetic changes. No billing during the pilot.

## Required end-of-phase report

Record phase, implemented flows, migrations applied and environment, tests with results, browser evidence, known limitations, startup URL, and remaining tasks. Unrun tests are marked not run. If no live database access exists, say which checks remain blocked; do not call the database integration verified.
