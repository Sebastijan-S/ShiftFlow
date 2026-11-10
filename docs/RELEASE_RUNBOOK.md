# Invited pilot release runbook

Prepared locally on 10 November 2026. The application is not deployed. The Phase 3 gate remains open until the deferred Auth and live tests pass.

## Local startup

Use Node 24.15.0 and pnpm 12.18.0 (via Corepack). Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the intended project. Only the publishable key belongs in browser configuration. Run `corepack pnpm install --frozen-lockfile`, `corepack pnpm dev --port 3001`, then open `http://localhost:3001` in Google Chrome. No service-role key is needed by the app.

For local release verification run `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test:schema`, `corepack pnpm test:schedule`, `corepack pnpm test:hosted-anon`, `corepack pnpm test:browser`, `corepack pnpm test:schedule-browser`, `corepack pnpm test:shared-browser`, and `corepack pnpm build`. Browser tests expect a local server on port 3001 and explicitly launch installed Google Chrome. Fixture browser tests mock manager network traffic; they do not prove live Auth or authenticated database writes.

## Database and provider

Target project: `srpvabzbekenbuxxrbvr` in `eu-central-1`. Confirm project ID, schema, migration history, and current backup before every new migration. The seven existing migrations are ordered by their timestamped filenames in `supabase/migrations/`. No Phase 3 migration has been applied. Replay them first in an isolated database. Keep disposable fixture accounts and destructive restore checks outside the hosted project.

During the separately requested final review, configure Supabase Auth for email and phone password signup without confirmation or OTP gates, then test both paths with isolated accounts, expired/refreshable sessions, logout, setup reload, authenticated writes, and two separate business sessions. Record actual provider settings and remove fixture accounts after verification. Do not treat client validation or mocked sign-in as proof.

## Launch and rollback

Before launch, choose the host/domain and support address, verify runtime environment values and current database backup, finish the acceptance checklist, and obtain explicit deployment instruction. Build the exact release commit and deploy that commit with the two public environment values. Smoke-test the live URL in Chrome: both login identifiers, setup, Generate, save/reload, replacement, publication, and anonymous team link. Send invitations only after these pass.

If a release fails before data changes, revert the host to the previous deployment. If a migration is involved, stop writes, restore only from a verified backup in a disposable rehearsal first, and plan a forward repair or a reviewed restore of the hosted project. Never run a production reset or force-push as a rollback shortcut. Revoke a leaked team link in Settings and rotate it before sharing a replacement URL.
