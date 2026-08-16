# Deployment Checklist

Concrete steps from "downloaded this zip" to "live, tested, real money flowing through it safely." Follow in order — later steps depend on earlier ones.

## 1. Push to GitHub

```bash
unzip econnect-scaffold.zip && cd econnect
git init
git add .
git commit -m "Initial commit — Econnect v1 MVP"
# create a new repo on GitHub, then:
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Database

- Create a free-tier Postgres instance: [Neon](https://neon.tech) or [Render Postgres](https://render.com) both work. Copy the connection string.
- Locally, create `apps/api/.env` from `apps/api/.env.example`, paste in `DATABASE_URL`.
- Run the migration — **this has never been run**, since I couldn't reach Prisma's binary server from this sandbox:
  ```bash
  cd apps/api
  npm install
  npx prisma migrate dev --name init
  ```
  This creates every table from the schema (including the `category`/`video_url` fields added during the Venues epic). Confirm it completes with no errors before moving on.

## 3. Third-party accounts (all have free/test tiers)

- **Paystack**: sign up, grab your **test-mode** secret key first (`sk_test_...`) — never use live keys until you've tested the full flow.
- **Cloudinary**: sign up, grab cloud name + API key + API secret (free tier is plenty for launch).
- Fill in `apps/api/.env` with these values, plus generate random strings for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `QR_SIGNING_SECRET` (e.g. `openssl rand -hex 32` for each).

## 4. Local smoke test (do this before deploying anywhere)

```bash
npm run dev:api    # terminal 1
npm run dev:web    # terminal 2
```

Manually walk the full loop once, end to end:
1. Register an account, apply as an organizer
2. Register a second account (or use Prisma Studio: `npx prisma studio`) to manually flip your organizer's `verification_status` to `verified` — there's no admin account yet on a fresh DB
3. Create an admin account the same way (manually set `role: admin` in Prisma Studio on some user)
4. Create + publish an event, buy a ticket with a Paystack **test card**, confirm a QR ticket appears
5. Scan that QR code as the organizer, confirm check-in works and a second scan says "already used"
6. As admin, create a venue, request a booking as the organizer, accept it as admin, pay the deposit

If any step breaks, fix it here — locally — before deploying.

## 5. Deploy

- **API → Render**: new Web Service, connect your GitHub repo, root directory `apps/api`, build command `npm install && npm run build`, start command `npm start`. Add all the same env vars from your local `.env` in Render's dashboard. Set up a **staging** environment first if you want a safe space to keep testing with Paystack test keys before going live.
- **Web → Vercel**: import the repo, root directory `apps/web`, framework preset Vite. Set `VITE_API_BASE_URL` to your deployed Render API URL + `/api/v1`.
- Update `PAYSTACK_WEBHOOK_SECRET` / confirm your Paystack dashboard's webhook URL points to `https://your-api.onrender.com/api/v1/webhooks/paystack`.

## 6. Load test (release gate — see README.md)

Run `scripts/load-test-ticket-purchase.mjs` against your **staging** deployment before trusting the ticket-purchase flow with real money:

```bash
cd apps/api
API_BASE_URL=https://your-staging-api.onrender.com/api/v1 \
TICKET_TIER_ID=<a real tier id with e.g. 10 tickets available> \
EXPECTED_AVAILABLE=10 \
CONCURRENT_BUYERS=50 \
npm run load-test:tickets
```

Confirm it prints `✅ PASS`. If it doesn't, do not go live with real payments until you understand why.

## 7. Go live

- Swap Paystack test keys for live keys (in Render's env vars, not locally)
- Onboard your first real organizers and venues manually, per the Phase 9 roadmap
- Everything from here is real usage — watch your logs

---

**What's intentionally not done yet** (fine to launch without, listed so it's a choice, not a surprise):
- Google login and phone OTP (email/password works)
- Admin analytics dashboard, event moderation UI, automated email/SMS notifications
- Vendors (equipment/catering) — deferred as a fast-follow, see project notes
