# Econnect

Nigeria-first event ticketing and venue booking platform. Monorepo containing the web app, API, and shared types.

## Structure

```
apps/web/             React + TypeScript frontend (Vite, Tailwind)
apps/api/              Express + TypeScript backend (Prisma/PostgreSQL)
packages/shared-types/  Types shared between web and api
docs/                   PRD, architecture notes, API reference
```

## Local development

1. Install dependencies from the repo root: `npm install`
2. Copy env templates: `cp apps/api/.env.example apps/api/.env` and `cp apps/web/.env.example apps/web/.env`, fill in real values (use Paystack/Flutterwave **test-mode** keys locally)
3. Start PostgreSQL locally (or point `DATABASE_URL` at a hosted dev DB)
4. Run migrations: `npm run prisma:migrate --workspace=apps/api`
5. Start both apps:
   - `npm run dev:api` (http://localhost:4000)
   - `npm run dev:web` (http://localhost:5173)

## Deployment

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for a full step-by-step checklist** from downloading this project to a live, tested deployment — including the database migration (never yet run), third-party account setup, a manual smoke test script, and the load test release gate.

Summary:
- **Web** deploys to Vercel, auto-deploy on push to `main`, preview deploys on PRs.
- **API** deploys to Render, auto-deploy on push to `main` (production) and `staging` (staging environment with test payment keys).
- Database migrations run as a deploy step, not manually against production.

See `docs/ARCHITECTURE.md` and `docs/PRD.md` for the full product/technical plan.

## Load testing (before going live with real payments)

`apps/api/scripts/load-test-ticket-purchase.mjs` fires concurrent purchase
attempts at a single ticket tier to prove the atomic reservation logic
prevents overselling under real concurrent load — see the script's header
comment for full prerequisites and usage. This needs a real Postgres
database and cannot be meaningfully run against mocks. Treat this as a
release gate for the ticketing flow, not optional polish:

```bash
cd apps/api
API_BASE_URL=https://your-staging-api.com/api/v1 \
TICKET_TIER_ID=<uuid> \
EXPECTED_AVAILABLE=10 \
CONCURRENT_BUYERS=50 \
npm run load-test:tickets
```
