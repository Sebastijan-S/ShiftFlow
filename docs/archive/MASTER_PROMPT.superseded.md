# SUPERSEDED - historical reference only

Do not implement this brief. The active MASTER_PROMPT.md and docs replace it.

# ShiftFlow — master rebuild prompt

Paste this prompt into your coding assistant in Visual Studio Code with NewShiftFlow open. Attach the app screenshots in the same chat.

## Objective and boundaries

Rebuild ShiftFlow as a clean, maintainable, live web application. Reproduce the existing app's implemented functionality and match my supplied screenshots as closely as possible. This first release is a production-ready recreation of the current version, not a feature upgrade or redesign.

The existing application already uses Next.js, TypeScript/TSX, and a Supabase/PostgreSQL integration. This is a clean rebuild on that stack, not a migration from another framework.

- New project: C:\Users\Cebo\Documents\NewShiftFlow
- Original, read-only reference: C:\Users\Cebo\Documents\shiftflow
- GitHub destination: https://github.com/Sebastijan-S/ShiftFlow.git
- Supabase project URL: https://srpvabzbekenbuxxrbvr.supabase.co
- Ignore the Work GPT "ShiftFlow 2" project completely. Do not recover, import, or use it.
- Never overwrite or delete the original reference project.
- Do not implement the old unfinished roadmap as part of this release.
- Preserve intended behavior while fixing defects that prevent reliable, secure production use. Explain any necessary user-visible deviation before implementing it.
- This prompt authorizes local development. A production database migration, public deployment, or Git push needs an explicit instruction for that action; reuse authorization already given in this chat.

## Sources of truth

1. My screenshots define visual appearance: layout, spacing, sizing, typography, colors, icons, content, and states.
2. The original source, README, tests, and implemented flows define functional behavior.
3. The README's unfinished-work list is a scope exclusion, not a task queue.
4. If screenshots and behavior disagree, identify the specific conflict. Do not silently invent an answer.

Read the original AGENTS.md and all project documentation before coding. Inspect the implementation and tests rather than accepting README claims as proof. The full original three-phase plan was not found; do not invent it.

Known reference files:
- src/components/shiftflow.tsx
- src/lib/scheduler.ts
- src/lib/storage.ts
- src/lib/supabase.ts
- src/lib/demo.ts
- src/app/shiftflow.css and globals.css
- supabase/migrations/202611030001_shiftflow.sql
- tests/scheduler.test.ts and tests/database.test.ts

The original repository was last observed on main at commit 3499919, with no remote configured and eight missing tracked files:
.env.example, .gitignore, components.json, next-env.d.ts, next.config.ts, pnpm-lock.yaml, pnpm-workspace.yaml, postcss.config.mjs.
Recheck these facts. Read missing reference files using git show HEAD:<path>; do not modify the original checkout. Do not copy node_modules, .next, out, or old hosting metadata into the new project.

## Technology and architecture

Use:
- Next.js App Router and React.
- Strict TypeScript; .tsx for React UI and .ts for logic.
- Supabase PostgreSQL, Auth, and the official Supabase client libraries.
- Tailwind CSS with focused custom styles where needed for screenshot fidelity.
- Accessible UI primitives; reuse the original component/font/icon choices when they match the screenshots.
- pnpm, a committed lockfile, and a documented compatible Node.js version.
- Google Chrome for browser testing and screenshot comparison. Do not use Brave.

Verify current supported versions and official Next.js/Supabase documentation before scaffolding; pin a tested dependency set. Read installed Next.js guidance. Do not assume APIs from another version.

Prefer an ordinary Next.js server deployment, with Vercel as the proposed hosting target. Confirm hosting/account/domain availability before deployment. Do not carry over static-export constraints without a reason.

Keep the design simple:
- app: routing, layouts, loading/error boundaries.
- features/schedule, employees, availability, rules, settings, history: cohesive feature components and hooks.
- components/ui: shared visual primitives.
- lib/scheduler: pure scheduling and validation functions.
- lib/supabase: separate browser/server clients and typed database access.
- supabase/migrations: versioned database schema and access policies.
- tests: domain, database integration, and essential browser flows.

Adapt this structure to actual needs; do not create empty abstractions. Keep data access and scheduling rules out of large presentation components. Use Server Components where appropriate and Client Components for interactive scheduling. Do not introduce a separate API service, ORM, state framework, or realtime system without a demonstrated requirement.

## Functional parity for the first release

Verify and reproduce these existing capabilities:

### Scheduling
- Seeded demo café with ten employees and the existing staffing requirements.
- Deterministic schedule generation, preserving the existing algorithm's behavior; do not replace it with a new optimization strategy.
- Employee positions, weekly availability, preferred shifts, target hours, weekly limits, rest periods, overnight shifts, and adjacent-week checks.
- Blocking rules versus warnings, uncovered demand, and coverage/hour summaries.
- Preserve locked assignments during regeneration.
- Manual assignment creation, editing, deletion, notes, and drag-and-drop with validation.
- Copy the schedule into an empty following week.
- Weekly, daily, and list views; search, position filtering, and week navigation.
- Draft/published status and publication checks.

Preserve current publishing semantics: edits to a published schedule update its published view. Do not introduce a separate draft-and-published snapshot workflow from another project.

### People and workspace
- Employee creation/editing, active status, fixed existing positions, target hours, and shift preferences.
- Recurring weekly availability.
- Staffing requirements, work rules, editing existing shift names/times, and café settings.
- Dashboard, local undo/redo history, notifications currently derived from schedule status, and error feedback.
- Theme/view preferences, light/dark themes, Serbian Latin text, 24-hour time, and Europe/Belgrade scheduling dates.

### Persistence, accounts, and sharing
- Isolated local demo with persistence and undo/redo surviving reload.
- Real signup, email-confirmation handling, login, session restoration, and logout.
- New registered companies begin empty, without demo employees or schedules.
- Company-scoped durable saving, clear saving/error states, and correct retry behavior.
- Atomic writes, version checks to reject stale saves, and retained recovery data.
- Owner/manager database permissions already defined by the reference.
- Private published-schedule links, rotation/revocation, expiration, and a restricted employee-facing view.
- Share views must exclude internal notes, availability, target hours, history, and unrelated company data.
- PNG export and print-to-PDF with the existing privacy behavior.

Do not present success before the relevant durable operation succeeds. Test rapid edits, failed requests, session changes, and reloads so data is not silently lost or written to another workspace.

## Supabase and data design

Inspect the supplied project's existing tables, migrations, policies, and data through authorized read-only access before proposing changes. Do not assume the database is empty or that the reference migration has been applied. Do not reset it or apply the old migration blindly.

Use the original schema as the functional reference. Keep tenant-owned records tied to their company and enforce tenant boundaries in the database. Preserve atomic scheduling writes, audit history, and optimistic concurrency. If keeping both a workspace document and normalized tables, maintain them in a single transaction with a clearly documented source of truth.

Enable RLS on exposed tables. Test authorization using actual caller roles. UI checks alone are insufficient. Review function privileges, SECURITY DEFINER boundaries, ownership changes, and shared-link responses. Never trust user-editable metadata for authorization.

Use current official Supabase guidance for browser/server clients, sessions, and trusted server authentication. Avoid cross-user caching.

Keep configuration in environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

I have a publishable key; obtain it from my supplied configuration rather than inventing one. Do not embed credentials in application source or this document. Commit only a placeholder .env.example. Never expose service-role or secret keys in client code. A publishable key is not administrative database access; request the appropriate connection only if required work is blocked.

Generate typed database definitions from the verified schema. Track changes in migrations, validate them in an isolated environment, and document deployment and recovery steps. Configure Auth site/redirect URLs for the actual preview and production environments before testing real email flows.

If production already contains real data, prepare a preservation/migration approach before applying schema changes. Do not automatically upload browser demo data.

## Explicitly out of scope

Do not add:
- Guided onboarding.
- Manager invitation/removal UI.
- Custom positions or creation of additional shift templates.
- Date-specific absences or replacement-tracking workflows.
- Cascading action menus, individual-shift duplication, or bulk editing.
- A server-notification inbox.
- Automatic multi-manager realtime synchronization or a conflict-merging interface.
- Billing, subscriptions, employee accounts, new dashboards, AI features, or a visual redesign.

Existing prepared tables or RPCs do not make these finished product features. Retain compatibility where necessary, but do not surface new workflows.

## Execution plan

### 1. Establish the reference
Read the original project and supplied screenshots. Create a concise parity checklist linking each screen/flow to its source and screenshot. Record missing screenshots and distinguish verified behavior from assumptions.

Ask only for material missing information. Screenshots cannot establish hidden interactions: inspect source first. If a screenshot is unavailable, label the reconstruction as provisional instead of claiming 1:1 verification.

### 2. Create a reproducible foundation
Scaffold only in NewShiftFlow. Add configuration, scripts, environment placeholders, and appropriate ignore rules. Port or recreate meaningful characterization tests for scheduling and history before changing their implementation.

Check the current GitHub repository before deciding how to attach the new project to it. Preserve existing remote history; do not force-push. Keep the reference version available as a baseline when preparing the eventual commit history.

### 3. Recreate the UI and existing local behavior
Build the shell and existing screens using the supplied screenshots. Separate components by responsibility. Wire the real domain logic and local demo behavior incrementally; avoid a collection of disconnected mock screens.

Compare the same viewport, theme, dates, data, and interaction states in Chrome. Check dialogs, menus, loading/error/empty states, exports, responsive layouts, and keyboard behavior. Preserve actual assets and fonts where appropriate.

### 4. Make the existing backend flows work
Connect the verified Supabase schema and authentication. Implement company-scoped persistence, permissions, atomic saves, conflict rejection, private links, and recovery behavior. Verify complete workflows against an isolated test environment before touching production.

### 5. Verify release readiness
Run type checking, linting, unit/integration tests, and a production build. Run browser tests for:
- Demo persistence, editing, generation, locking, undo/redo, and export.
- Signup/confirmation/login/logout and an empty new company.
- Persisted edits across reload and a second authenticated session.
- Company isolation, owner/manager permissions, and unauthorized requests.
- Stale concurrent writes, failed saves, retry, and rapid successive edits.
- Publish/share, expired or revoked links, and absence of private fields.
- Visual comparison for every supplied screenshot.

Use a real browser and real Supabase flows to validate integration; a mocked Auth or PGlite test is not proof of working production authentication. Report passed checks, failures, and unverified items honestly.

### 6. Prepare and launch
Prepare a reviewable source commit, deployment configuration, environment-variable checklist, Auth URL settings, migration instructions, and rollback instructions. Do not commit generated output or secrets.

After explicit launch authorization, push normally, apply only reviewed required migrations, deploy, and smoke-test the live URL and private schedule links. Verify employee links are accessible without granting access to the management interface.

## Definition of done

The new repository installs reproducibly, passes its checks, and builds successfully. Every in-scope feature has verified parity. Supplied screenshots have been compared against the implemented screens, with any remaining differences disclosed. Auth, durable saving, tenant isolation, and sharing work against Supabase. No excluded feature has been introduced.

"Ready to deploy" and "live" are different milestones. Only call the application live after deployment and a successful smoke test at its actual URL.

Provide a concise handover with:
- What was recreated and any approved deviations.
- Test/build results and remaining limitations.
- Local startup instructions and required environment variables.
- Git commit and deployment URL when available.
- Database migration status and recovery instructions.

## Start here

First inspect the reference project and the screenshots I provide. Respond with a brief parity summary, any essential missing references, and the first implementation step. Do not restart product discovery or expand the feature list. If I have asked only for planning, stop after the plan; begin implementation when I instruct you to start.
