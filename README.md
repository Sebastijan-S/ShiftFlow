# NewShiftFlow — pilot application

Status: Phase 2 code and hosted schema implemented; the Phase 2 acceptance gate remains open pending real Auth and hosted manager round trips. The user deferred provider settings and signup verification until final review. Updated 10 November 2026.

## Local development

Use Node 24 and pnpm 12.18.0 (`corepack pnpm` if pnpm is not on PATH). Copy `.env.local.example` to `.env.local`, set the project's publishable key, then run `corepack pnpm install --frozen-lockfile` and `corepack pnpm exec next dev --port 3001`. Open `http://localhost:3001` in Google Chrome. Port 3000 may serve the old read-only project on this machine. The local `.env.local` is ignored by Git.

Run `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, `corepack pnpm test:schema`, `corepack pnpm test:phone`, `corepack pnpm test:schedule`, and `corepack pnpm test:hosted-anon`. With the dev server running, `corepack pnpm test:browser`, `corepack pnpm test:schedule-browser`, and `corepack pnpm test:shared-browser` use the installed Google Chrome executable. The schedule browser test uses isolated network fixtures; it does not prove live Auth behavior.

See [Phase 2 status](docs/PHASE2_STATUS.md) and [Phase 1 status](docs/PHASE1_STATUS.md) for verified behavior and deferred checks. The hosted schema is managed by [versioned migrations](supabase/migrations/).

## Pojednostavljeni prikaz za pilot

Posle prijave otvorite `https://shiftfflow.netlify.app/radni-raspored`. Tu su samo **Raspored** sa postojećim generisanjem i izmenama i **Odsustva i izuzeci** za ceo dan ili deo dana. Redovna nedeljna dostupnost, tim i podešavanja ostaju na glavnoj adresi. Ovaj prikaz koristi isti postojeći nalog i prava pristupa; posebni nalozi i ograničene uloge nisu deo ove pilot izmene. Na stranici nema dugmeta za povratak na glavni prikaz. Objavljeni link za tim je i dalje zaseban i samo za čitanje.

Build a reliable shift scheduler for businesses with shift-based teams. The core promise is: enter staffing needs and who cannot work when, click Generate, and receive a usable schedule. Manual changes handle exceptions.

This pack supersedes the earlier 1:1 recreation brief. The original download is incomplete; it is reference material, not a working baseline to reproduce blindly. The Work GPT ShiftFlow 2 project is excluded.

## Start in VS Code

Open this folder as the workspace. Start each phase separately and review its completion report before requesting the next.

**Phase 1 prompt**
> Read AGENTS.md, MASTER_PROMPT.md, and the active documents in docs/. Implement Phase 1 only. Start with the database foundation and authentication, then the light-blue interface and business setup. Run the Phase 1 checks and stop with a completion report.

**Phase 2 prompt**
> Review the completed Phase 1 and its checks. Implement Phase 2 only, following the generator, replacement/swap, persistence, and sharing requirements. Run the Phase 2 checks and stop with a completion report.

**Phase 3 prompt**
> Review Phases 1 and 2. Complete Phase 3 testing, pilot preparation, and fixes. Prepare the release and report readiness. Do not publish publicly until I explicitly ask you to deploy.

If a previous phase is incomplete, finish or explain the dependency before starting the next. Do not silently jump phases. Phase completion requires demonstrated behavior, not just files being present.

## Reading order

1. [Master prompt](MASTER_PROMPT.md)
2. [MVP scope and prices](docs/MVP_SCOPE.md)
3. [Three-phase roadmap](docs/ROADMAP.md)
4. [Design system and images](docs/DESIGN_SYSTEM.md)
5. [Database and technical plan](docs/TECHNICAL_PLAN.md)
6. [Acceptance checklist](docs/ACCEPTANCE_CHECKLIST.md)
7. [Pilot guide](docs/PILOT_GUIDE.md)
8. [Database inspection](docs/DATABASE_STATUS.md)

[Reference images](references/README.md) are supplied by the user. Material under docs/archive is superseded and must not drive implementation.

## Approved decisions

- Next.js App Router, TypeScript/TSX, Supabase PostgreSQL and Auth, shadcn preset b2fA9jiwaO.
- Light-blue default design; industry-neutral business/team terminology.
- Excellent automatic generation is the main selling point, including date/time unavailability.
- Drag-and-drop replacements, two-way swaps, cascading contextual menus, and locking.
- One stable read-only team link for published weekly calendars.
- Email OR phone number + password; no email/SMS confirmation during the pilot.
- Basic: EUR 15/business/month. Premium: EUR 25/business/month for now. Business-specific Premium adaptations are later work.
- Invited pilot testing is free; billing implementation is excluded.

## Boundaries

Phase 1 source was published to GitHub `main` at `f7b3e5b`. Phase 2 has added three hosted schema migrations; Auth settings remain unchanged. Phase 2 has not been pushed or deployed. Deployment provider, public domain, final Premium entitlements, and tax display remain launch/business decisions.
