# Pilot acceptance checklist

All boxes start unchecked. Record evidence, environment and date when checking an item. Tests below are planned; this document is not a test report.

## Phase 1 — foundation

- [x] Reproducible install, pinned lockfile, type check, lint and production build. Evidence: 9 November 2026, local Node 24.15.0 / pnpm 12.18.0, `pnpm-lock.yaml`; `corepack pnpm typecheck`, `lint`, and `build` passed.
- [x] Preset b2fA9jiwaO applied through official tooling; actual configuration recorded. Evidence: 9 November 2026, `shadcn@4.23.0 init --preset b2fA9jiwaO`; resolved base-nova style, mist base, phosphor icons, CSS variables, Public Sans heading and Roboto Slab serif; see `components.json` and Phase 1 status.
- [ ] Light-blue responsive shell, readable forms, keyboard focus and error states.
- [ ] Email + password signup/login works without signup email confirmation.
- [ ] Phone + password signup/login works without SMS/OTP confirmation; normalization and invalid-number errors tested.
- [ ] Wrong password, duplicate identifier, reload/session refresh and logout behave correctly.
- [ ] One owner/workspace created exactly once; failed/retried bootstrap creates no orphan or duplicate workspace.
- [ ] Employees, roles, shifts, staffing rules, weekly windows and date exceptions persist after reload.
- [ ] Real businesses start empty; demo fixtures cannot leak into a business.
- [ ] D1/D2 database tests below pass.

## Phase 2 — generator and scheduling

- [ ] Known-feasible hospitality, customer-service and retail fixtures are fully covered without manual cleanup.
- [ ] Hard constraints never fail: inactive/unqualified employee, unavailable interval, overlap, hour maximum, rest and lock preservation.
- [ ] Partial-day absence, overnight shift, adjacent-week rest and timezone/DST fixtures pass.
- [ ] Tiny exhaustive-oracle fixtures catch greedy dead ends and verify complete solutions are found.
- [ ] Repeated generation with equivalent input is reproducible; fairness metrics are measured.
- [ ] Impossible demand remains visibly unfilled with useful reasons; timeout is reported separately from proven infeasibility.
- [ ] Invalid locked assignments are surfaced without silently moving them.
- [ ] Cancelling/failing generation leaves the previous draft intact.
- [ ] Stale generation input cannot overwrite later availability or manual changes.
- [ ] Desktop week and mobile day/agenda views support week navigation and filters.
- [ ] Drag replacement preserves the shift's date, time and role.
- [ ] Two-way swap validates both employees and all neighboring assignments; invalid swaps leave both unchanged.
- [ ] Cascading menus, touch and keyboard alternatives offer equivalent actions.
- [ ] Locked assignments require deliberate unlocking; undo restores a committed local operation safely.
- [ ] Clear saving/failed/retry states; no "Saved" label before durable success.
- [ ] Publish requires complete demand coverage and no hard violations.
- [ ] Draft edits do not change the employee view until Publish update succeeds.
- [ ] The same team URL opens successive published weeks; no account required.
- [ ] Unpublished weeks, internal notes, contacts and availability are absent from share responses.
- [ ] Link revocation/rotation works; routine publication does not rotate it.
- [ ] Print/PDF is readable and excludes internal details.
- [ ] Basic EUR 15 and Premium EUR 25 appear accurately without active checkout.
- [ ] D3 database tests below pass.

## Database integrity suite — run at D1/D2/D3/D4 as applicable

| Test | Required evidence |
| --- | --- |
| Tenant isolation | Owner A cannot select/mutate B's rows through direct table or RPC access |
| Tenant foreign keys | Cross-business employee/role/template references are rejected |
| Anonymous caller | No business reads/writes; only restricted shared-published response |
| Role escalation | Client metadata and supplied workspace/actor IDs cannot elevate access |
| Input validation | Negative staffing, invalid dates/times, malformed rules and invalid references rejected |
| Atomic save | Injected error leaves previous schedule/revision/audit consistent |
| Atomic swap | First-side success cannot persist if second side fails |
| Publication | Incomplete/invalid schedule rejected; existing published snapshot unchanged |
| Retry | Repeating operation ID does not duplicate writes/events |
| Concurrent sessions | Same expected revision allows one winner; loser receives conflict |
| Revision recovery | Local proposal retained; reload cannot silently overwrite a newer server version |
| Session isolation | Logout/account switch clears old workspace data and pending writes |
| Date correctness | Half-open intervals, overnight, adjacent week and DST fixtures pass |
| Link privacy | Published response includes only allowed fields; revoked token yields no schedule |
| Migration replay | Fresh isolated DB reaches expected schema; generated types match |
| Restore rehearsal | Disposable backup restores consistent records, references and publication state |
| Performance | Representative week queries checked for avoidable unbounded scans |
| Advisors | Security/performance notices reviewed and relevant findings resolved |

Use two actual isolated test identities and an anonymous caller. Owner-only test requests or mocks do not prove RLS. Do not read real users' credentials or run destructive tests against pilot data.

## Phase 3 — release gate

- [ ] D4 database review completed after final migrations.
- [ ] Real Supabase Auth/session tests pass; PGlite or mocks alone are not accepted.
- [ ] Chrome desktop/mobile flows checked, including actual touch/keyboard alternatives where available.
- [ ] Generator coverage/fairness/timing results recorded at representative sizes.
- [ ] No unresolved unauthorized access, data loss, invalid assignments or broken publication defects.
- [ ] Pilot guide and feedback route are usable; no raw tokens/passwords/private notes in logs.
- [ ] Environment, Auth provider settings, migration order, backups and rollback documented.
- [ ] Hosting/domain and launch authorization confirmed before public deployment.
- [ ] After deployment, live signup/login, setup, Generate, replacement, save/reload and shared-link smoke tests pass.
- [ ] Final handover distinguishes tested live behavior from limitations.

## Evidence format

For each group record: build/commit, environment/project, date, test command or steps, expected/observed result, and screenshot/log path where useful. Never include passwords, tokens or real employee contact data in evidence.

If a gate fails, fix and rerun the affected tests plus relevant regressions. Avoid repeatedly rerunning unrelated checks without a change or unresolved concern.
