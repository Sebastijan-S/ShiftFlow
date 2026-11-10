# Phase 1 implementation status — 10 November 2026

The project schema and setup UI are implemented. The user deferred pilot Auth settings and real signup checks until the final review and wants local test accounts meanwhile. Real account, tenant, and reload round trips are still unverified; this report does not claim those checks passed.

## Implemented

- Next.js 16.4.5 App Router, React 19.3, strict TypeScript, Tailwind 4, pinned pnpm lockfile. The official shadcn 4.23 CLI applied preset `b2fA9jiwaO`. Resolved settings: `base-nova`, `mist`, CSS variables, `phosphor` icons, Public Sans heading and Roboto Slab serif. Light-blue application tokens and responsive forms override the neutral colors.
- Supabase Auth email or E.164 phone plus password UI, session restoration and logout code. No confirmation, OTP, or social login screen exists.
- Workspace bootstrap, owner membership, roles, employees and eligibility, shift templates, weekly availability, date exceptions, staffing requirements, and scheduling rules. Forms save to Supabase with explicit status and error messages. Real workspaces start empty.
- Hosted migrations `20261109223308_phase1_foundation.sql`, `20261109223647_phase1_foreign_key_indexes.sql`, and `20261109224326_phase1_protect_staffing_references.sql` applied to project `srpvabzbekenbuxxrbvr` in `eu-central-1`. Ten public tables have RLS. Staffing references cannot be silently removed by deleting a role or shift. No schedule or publication table was added in Phase 1.

## Checks performed

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck`, `lint`, `build` | Passed locally |
| `corepack pnpm test:schema` | Passed isolated PGlite replay, owner/tenant/anonymous/input checks |
| `corepack pnpm test:phone` | Passed E.164 normalization and invalid number checks |
| `corepack pnpm test:browser` | Passed in installed Google Chrome at 390, 768, 1440 px; login UI, invalid phone, and generic unknown-account error. Screenshots in ignored `test-results/` |
| Hosted anonymous REST | `GET workspaces` returned `[]`; `POST workspaces` rejected with HTTP 401 |
| Supabase advisors | Security: no findings. Performance: no unindexed foreign keys after second migration; only unused-index notices on empty tables |
| Hosted Auth settings (`/auth/v1/settings`) | Email enabled, `mailer_autoconfirm=false`; phone disabled, `phone_autoconfirm=false` |

## Remaining Phase 1 checks

Use isolated local test accounts to exercise setup persistence and tenant boundaries before relying on the pilot Auth configuration. At final review, enable no-confirmation email and phone password signups for the named Supabase project through Auth → Providers. The available connector can inspect Auth settings but has no Auth configuration mutation tool. Then test real signup/login, wrong password, duplicate identifiers, refresh/logout, owner bootstrap and setup save/reload with two isolated identities and direct cross-tenant requests. Inspect the app shell and saved forms in Chrome at desktop and mobile sizes. Do not mark unchecked acceptance items complete.

Local startup: `corepack pnpm install --frozen-lockfile`, then `corepack pnpm exec next dev --port 3001` and open `http://localhost:3001` in Google Chrome. The local `.env.local` contains only the project URL and publishable key; no privileged database secret is in client code. No deployment occurred. The project source is committed to `main` after the mistaken folder was removed from the remote branch.
