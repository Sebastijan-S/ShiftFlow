# Phase 3 local hardening status — 10 November 2026

Phase 3 local preparation is complete; the release gate is **open**. Real Supabase email/phone registration and Auth settings are deliberately deferred to the user's separate final-review request. No Phase 3 Git push or deployment was made. The pre-Phase 3 baseline was pushed as `5999942` to `origin/main` with the user's authorization.

## Implemented and checked

- The invited tester guide now defines a reply-to-invitation support route, an urgent-report subject, a feedback template and triage order. The release runbook records local setup, environment variable names, ordered migrations, provider checks, launch and rollback steps.
- Representative scheduling tests now report coverage, hard violations, elapsed time, aggregate target-hour deviation and late-shift range. Hospitality, service and retail fixtures at 10, 25 and 50 people all achieved 100% coverage with zero hard violations. The 20–112 slot cases took about 0.1–4.0 seconds on local Node 24.15.0. Target-hour deviations of 72–1120 hours are absolute totals across all employees and include structurally unassignable target hours; they are measurements, not optimality claims. Late-shift ranges were 0–2 or 1–2 per person, depending on fixture. One tiny instance is proven infeasible by exhaustive search; a separate case reaches the configured search limit and is labeled inconclusive.
- PGlite replays all seven migrations. A disposable data-directory backup restores assignment, publication and operation-receipt counts, tenant references and the anonymous published response. Two simultaneous same-revision write attempts on the isolated connection produce one commit and one conflict. This does not replace a two-session hosted concurrency test.
- Chrome fixture manager journey passes at 1440 and 390 px; the keyboard Enter path cancels a shift. It covers Generate, replacement, queued edits, publish, undo, cancellation/restoration, multi-day availability and a 300-person list. The anonymous shared view passes at 390/768/1440 px with week navigation and no horizontal overflow. Print-media CSS hides manager controls. The unauthenticated Auth UI passes at 390/768/1440 px, including invalid phone and unknown login error handling.
- Hosted project `srpvabzbekenbuxxrbvr` was reinspected read-only: active, PostgreSQL 17.11, seven expected migrations. All 16 public application tables have RLS. Three private tables intentionally have no policies or client grants. The intended owner RPCs are executable by `authenticated`; the restricted bearer-token `read_team_week` RPC is executable by `anon` and `authenticated`. Hosted anonymous reads and schedule-save denial pass. Advisors show the intentional definer/public-link notices, the deferred Auth leaked-password-protection warning and unused indexes on very small tables. An `EXPLAIN` used a sequential scan on the 14-row assignments table; this is not a representative load benchmark.

## Database changes

No new migration or hosted schema change in Phase 3. The already-applied role-label/cancellation migration remains the latest (`20261110221627`). Backup/restore was performed only in a disposable PGlite database. No hosted rows or Auth settings were modified.

## Still unverified and release-blocking

- Real email and phone password signup/login without confirmation; provider configuration; reload, refresh/expiry, logout and account switching. No real registration was attempted.
- Authenticated hosted setup, save, swap, publication and same-link update with two isolated business identities and two independent sessions. Mocked browser and PGlite tests are not substitutes.
- Full touch gestures, keyboard navigation across every control, and an actual representative PDF export. Print-media screenshot is the current evidence.
- Hosted backup/restore rehearsal, production-scale query performance and live host/domain smoke tests. The disposable PGlite restore confirms local migration/data consistency only.
- Launch host/domain, working invitation reply address and explicit deployment instruction. No invitations have been sent.

Local URL: `http://localhost:3001` after following `RELEASE_RUNBOOK.md`. The application must not be described as released until the deferred final review and deployed smoke test pass.
