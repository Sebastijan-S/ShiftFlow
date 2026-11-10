# Phase 2 implementation status — 10 November 2026

Phase 2 code and hosted schema are implemented. The Phase 2 acceptance gate remains **open** because real authenticated manager round trips and a second live session are deferred with the Supabase Auth provider review. The Chrome manager journey uses isolated network fixtures, not a real account. No deployment or GitHub push occurred.

## Implemented

- Pure scheduling contract and bounded, deterministic backtracking search. Required coverage is first; target-hour balance, late-shift distribution, and preferences order valid candidates. The engine reports complete, incomplete, search limit, invalid locks, and cancellation separately. A worker provides progress and cancellation without replacing a prior draft on failure.
- Weekly grid, mobile day agenda, role filter, coverage/hours indicators, manual replacement, drag move/swap, two-way swap menu, lock/unlock, revision-aware undo, queued rapid edits, retry with the same operation ID, and explicit save/conflict states.
- Transactional `save_schedule` and `publish_schedule` RPCs. The database recomputes slot times and demand, checks ownership and setup/draft revisions, enforces active/eligible employees, availability and exceptions, overlap, rest, daily/weekly hours, locked assignments, adjacent weeks, and ambiguous DST boundaries. Receipts make retries idempotent; audit records share the transaction.
- Immutable safe published snapshots, one stable team link with revoke/rotate controls, anonymous read-only week navigation, and print styles. Settings show informational Basic EUR 15 and Premium EUR 25 per business per month; there is no checkout.
- Three hosted migrations on project `srpvabzbekenbuxxrbvr` (`eu-central-1`): `20261110084343_phase2_scheduling.sql`, `20261110084504_phase2_fk_indexes.sql`, and `20261110085234_phase2_dst_guard.sql`. The matching local files replay in PGlite. No hosted rows were reset and no hosted test accounts or schedule fixtures were created.

## Test evidence

| Check | Environment/result |
| --- | --- |
| `corepack pnpm install --frozen-lockfile`, `typecheck`, `lint`, `build` | Local Node 24.15.0 / pnpm 12.18.0; passed after allowing the pinned esbuild postinstall. |
| `corepack pnpm test:schedule` | Isolated PGlite and pure TS: hospitality, customer service, retail at 10/25/50 people all filled; 20–112 slots, 0.1–4.4 s on this machine. Determinism, tiny exhaustive oracle, incomplete vs limit, roles, inactive employees, partial absence, overnight, overlap, half-open boundary, rest, daily/weekly hours, locks, DST, swaps, stale setup/revision, rollback, retry, tenant isolation, and link privacy passed. Target deviation is logged, not a claim of optimal fairness. |
| `corepack pnpm test:hosted-anon` | Hosted anonymous direct REST/RPC: no business rows visible; schedule save denied; invalid team token returns no published week. No authenticated hosted write was attempted. |
| `corepack pnpm test:schedule-browser` | Installed Google Chrome, mocked Auth/database fixture: login, Generate, replacement preserving slot date/time/role, two rapid edits serialized at revisions 3/4, publish, undo at revision 5; desktop 1440 px and mobile 390 px. Print-media screenshot hides manager controls. Screenshots are in ignored `test-results/`. |
| `corepack pnpm test:shared-browser` | Installed Google Chrome, hosted anonymous API: unpublished team view and week navigation at 390/768/1440 px, no horizontal overflow. |
| Supabase advisors | New foreign-key index findings were resolved. Remaining unused-index notices reflect empty/new tables. RLS-no-policy notices for private audit/receipt/token tables and SECURITY DEFINER executable notices are intentional and require final review; `read_team_week` is the narrow bearer-token public RPC. Leaked-password-protection Auth warning is deferred with provider settings. |

## Open checks and limitations

- Real email/phone signup and login, session restoration, setup reload, authenticated hosted save/swap/publish, and a second concurrent live session were **not run**. Current hosted Auth settings still require final review; do not treat the mocked Chrome journey or PGlite role tests as proof of live account behavior.
- The shared link stores only its SHA-256 token hash in PostgreSQL. The manager's raw link is kept in that browser's local storage. On another device, the manager must use **Replace existing link**, which invalidates the previous URL. This should be revisited before the pilot if cross-device retrieval is required.
- Print CSS was inspected in Chrome print media with fixture data; an actual PDF export with a full representative week was **not run**.
- Drag/drop, rapid-edit queue recovery after a lost response, undo after a second-session conflict, a published week update at the same URL, and complete manager touch/keyboard flows were **not browser-tested**. The domain/database paths have isolated tests where noted above.
- The generator uses a bounded first-complete search with fair candidate ordering. Its logged target-hour deviation is not an optimization guarantee; broader fairness/undesirable-shift tuning and representative host benchmarks remain for the Phase 3 release review.

Local startup: `corepack pnpm install --frozen-lockfile`, then `corepack pnpm dev --port 3001` and open `http://localhost:3001` in Google Chrome. The developer server was already using port 3001 during Phase 2 tests. Next work is the user-requested final Auth and end-to-end review in Phase 3; do not start it automatically.

## Post-Phase 2 annotation changes — 10 November 2026

These requested edits precede Phase 3; they do not close the Phase 2 acceptance gate. Availability now uses a searchable employee list (three names initially, then batches of 25), multi-day selection, and a compact per-employee table. Team role names are job labels; every active employee is eligible for every label. Availability, overlap, rest, hours, and locks still constrain assignments. A scheduled shift can be explicitly cancelled for one day and restored with **Dodaj smenu**. Cancelled slots remain in the draft for audit/retry, but do not count as required coverage or appear in published snapshots. The settings panels flow into columns without the former empty grid row.

The hosted migration `20261110221627_20261110220708_flexible_role_labels.sql` was applied to project `srpvabzbekenbuxxrbvr` after identity/schema inspection. It backfilled employee/role pairs, adds triggers for new employees and labels, and adds `assignments.cancelled` plus revised save/publish validation. Hosted verification found zero missing role pairs, zero cancelled existing assignments, and all 14 pre-existing assignments still present. Auth settings were not changed.

Local `typecheck`, `lint`, `build`, `test:schema`, `test:schedule`, and Google Chrome `test:schedule-browser` passed. The Chrome journey uses isolated network fixtures, including multi-day availability, cancellation/restoration, and a 300-person team list. Hosted anonymous denial checks passed. Real authenticated hosted writes, second-session conflicts, and provider flows remain **not run** pending final review. No deployment or GitHub push occurred.

The informational pricing panel now appears in the left sidebar above the free-pilot badge and sign-out. On narrow screens, where the sidebar is hidden, it remains visible at the end of Settings. Fixture Chrome checks at 390/768/1440 px, `typecheck`, and `lint` passed after this move. Phase 3 has not started.
