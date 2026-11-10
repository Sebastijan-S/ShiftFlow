# ShiftFlow — master implementation prompt

You are implementing the first usable ShiftFlow pilot in Visual Studio Code. Read AGENTS.md and the active docs/ files before coding. Follow the phase requested by the user and stop after verifying that phase.

## Objective

Build a shift scheduler that managers can trust: enter team availability and staffing requirements, click Generate, and get a ready-to-use schedule when a solution is found. Manual changes are for exceptions, such as illness. Scheduling quality, fast replacements, and reliable database storage are the core product.

This is a fresh pilot, not a 1:1 copy of an incomplete old download. The two supplied screenshots are visual inspiration, translated into light blue/white. Do not recreate their dark theme or ScheduleMe branding.

## Workspace and references

- Implementation folder: C:\Users\Cebo\Documents\NewShiftFlow
- Incomplete old source, read-only: C:\Users\Cebo\Documents\shiftflow
- GitHub destination when publication is requested: https://github.com/Sebastijan-S/ShiftFlow.git
- Supabase project: srpvabzbekenbuxxrbvr
- Supabase URL: https://srpvabzbekenbuxxrbvr.supabase.co
- Preset: https://ui.shadcn.com/create?preset=b2fA9jiwaO
- Local images: references/style-overview.png and references/calendar-detail.png

Ignore Work GPT ShiftFlow 2 and docs/archive. Do not restore the earlier EUR 9.99 price, café-only positioning, old preset, or exclusions that conflict with this new scope.

## Required stack

Next.js App Router, React, strict TypeScript, .tsx UI, Supabase PostgreSQL/Auth, Tailwind CSS, and shadcn preset b2fA9jiwaO. Use pnpm, a committed lockfile, and documented compatible Node/package versions. Use current official framework guidance, not guessed APIs.

Apply the preset through the official CLI during Phase 1. The preset's precise output has not been generated in this planning step; record resolved configuration rather than inventing its font, radius, icons, or component library. Then apply the requested light-blue color direction.

Use separate presentation, domain, and data modules. Keep scheduling pure and independently testable. Use a conventional Next.js deployment; Vercel is a proposed target, not an already chosen/connected service.

## Non-negotiable behavior

1. Business-neutral workspaces and roles; hospitality, retail, and customer service are all valid pilot scenarios. Advanced business-specific Premium adaptations come later.
2. Signup/login with email OR phone + password, session restoration, and logout. No signup email/SMS confirmation during the pilot. Auth remains real Supabase Auth; no fake accounts or locally stored passwords.
3. Employees, role eligibility, shifts, staffing needs, weekly availability, date-specific absences, and partial-day unavailability.
4. High-quality automatic generation honoring hard constraints, locked assignments, overnight shifts, and adjacent-week boundaries. Fairness and preferences improve a valid schedule, never override constraints.
5. Honest outcomes: complete, incomplete with diagnosed gaps, or search limit reached. Do not claim mathematical infeasibility unless proven.
6. Direct replacement, drag-and-drop movement, two-way swaps, and cascading menus of eligible employees. Keep existing shift date/time without requiring the manager to re-enter them.
7. Atomic database saves, conflict rejection, clear failure/retry states, and undo of local scheduling actions that also respects server revisions.
8. One persistent read-only team link; employees see published weeks without accounts, never draft/private business data.
9. Light-blue responsive UI, print/PDF, and real browser verification in Google Chrome.
10. Basic EUR 15/business/month; Premium EUR 25/business/month. Pricing is informational; no payments or feature paywall in the pilot.

## Phases

Phase 1 establishes the schema, tenant boundaries, email/phone password Auth, design system, business/team/availability setup, and working persistence.

Phase 2 delivers the generator, weekly scheduling, exception handling, atomic swaps, publishing, and stable team sharing.

Phase 3 verifies realistic workflows, performs the final database review, resolves defects, and prepares the free invited pilot. Public deployment follows explicit launch instruction.

Use docs/ROADMAP.md for task order and docs/ACCEPTANCE_CHECKLIST.md for exit criteria. Do not start later-phase work just because earlier screens look finished.

## Database-first implementation

Read docs/DATABASE_STATUS.md and reinspect the actual schema before changes. The 9 November inspection found no public tables and no migration history; that observation may become stale.

Use normalized tables as the source of truth. Avoid recreating two competing writable copies of the whole business state. Keep published schedule snapshots immutable and deliberately restricted for sharing. Transactions must protect complete-week generation, replacement/swap, publication, and change history.

Tenant authorization belongs in the database. Test caller roles and cross-tenant references, not only authenticated UI paths. Do not grant privileges from user-editable metadata. Never expose privileged secrets in client code.

No confirmation for email/phone signup is a product requirement; it does not mean skipping tests or authorization. Never treat an unverified contact string as proof of business ownership.

## Working approach and handover

Start with a short current-state summary and concrete implementation steps for the requested phase, then work incrementally. Do not reopen product discovery. Ask only when a material unresolved decision blocks correct work.

Port useful old tests as references, then extend tests for the stronger generator and the new availability/swap requirements. Do not depend on the incomplete built files. Scaffold around these documents without deleting them.

At each phase end report implemented flows, database changes, tests run/results, known limitations, local startup instructions, and the next phase. Clearly separate checked behavior from assumptions. Never label an app live until the deployed URL passes the smoke test.

A request to start a phase authorizes its local implementation and tests. It is not blanket permission for production resets, billing, force-pushes, or public launch. Preserve existing Git history when connecting the stated repository.
