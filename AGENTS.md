# ShiftFlow project instructions

## Authority and scope

Follow the user's latest instructions first, then MASTER_PROMPT.md and the active docs in docs/. The user approved a new three-phase pilot, replacing the old parity-only brief. Ignore docs/archive and all Work GPT ShiftFlow 2 material.

Work only in this NewShiftFlow project unless the user directs otherwise. C:\Users\Cebo\Documents\shiftflow is an incomplete, read-only reference. Do not import its node_modules, .next, out, hosting metadata, or unverified SQL wholesale.

Implement only the requested phase. Continue autonomously through routine implementation and verification within that phase. At its completion, report results and stop; the user will request the next phase.

## Product rules

- Scheduling quality is central. Never call a simplistic partially filled result complete.
- Never violate hard availability, role, overlap, rest, or hour constraints to fill a schedule.
- Distinguish infeasibility from a search timeout; do not pretend either is a valid complete schedule.
- Preserve date/time when replacing an employee. A two-way swap validates both assignments and commits atomically.
- Treat database integrity and tenant isolation as essential, tested behavior.
- The user wants email/phone + password without confirmation during the pilot. Do not add OTP, confirmation gates, or social login.
- Use business-neutral language and the specified light-blue design.
- Basic EUR 15 and Premium EUR 25 are product prices, not authorization to charge anyone.

## Engineering

Use Next.js App Router, strict TypeScript, TSX components, Supabase PostgreSQL/Auth, and the specified shadcn preset. Verify current official docs and installed Next.js guidance before implementing version-dependent APIs. Use the Supabase skill if available.

Keep domain scheduling logic separate from UI and database access. Build cohesive components, not another all-in-one screen. Pin tested dependencies and commit the lockfile. Preserve these planning files while scaffolding the already nonempty folder; never clear the folder to satisfy a scaffolder.

Use Google Chrome explicitly for previews and browser tests; never Brave. Maintain a concise implementation status and test evidence as work proceeds. Do not mark unchecked work complete.

Reinspect the intended Supabase project before each migration. Use isolated fixtures/test environments for destructive checks. Database migrations, auth settings, Git publication, and live deployment must stay within the user's current authorization. Reuse existing authorization; do not introduce repetitive approval gates for routine local work.
