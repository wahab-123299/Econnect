#!/usr/bin/env node
/**
 * Load test: concurrent ticket purchase race condition (Issue #29).
 *
 * Fires N simultaneous order-creation requests at a single ticket tier and
 * confirms EXACTLY as many succeed as there is stock for — proving the
 * atomic reservation in order.repository.ts (see the UPDATE ... WHERE
 * quantity_sold + N <= quantity_total pattern) holds under real concurrent
 * load against a real Postgres, not just in the mocked unit tests.
 *
 * This CANNOT be meaningfully run against mocked repositories — it needs a
 * live database where Postgres's actual row-level write serialization is
 * what's being tested. Run this before trusting the ticket-purchase flow
 * with real money.
 *
 * PREREQUISITES (set up once, manually, before running):
 *   1. A running API instance (local `npm run dev:api` or a deployed one)
 *      pointed at a REAL Postgres — not a dry run.
 *   2. A verified organizer account.
 *   3. A PUBLISHED event with a ticket tier that has a small, known
 *      quantity_total (e.g. 10) and quantity_sold: 0 (a fresh tier).
 *   4. Paystack in TEST MODE — this script does not complete payment, it
 *      only exercises order creation (the reservation step), which is
 *      exactly the step this test targets. Orders will be left `pending`;
 *      that's expected and fine to clean up after.
 *
 * USAGE:
 *   API_BASE_URL=http://localhost:4000/api/v1 \
 *   TICKET_TIER_ID=<uuid of a tier with N tickets available> \
 *   EXPECTED_AVAILABLE=10 \
 *   CONCURRENT_BUYERS=50 \
 *   node scripts/load-test-ticket-purchase.mjs
 */

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const TICKET_TIER_ID = process.env.TICKET_TIER_ID;
const EXPECTED_AVAILABLE = Number(process.env.EXPECTED_AVAILABLE ?? 10);
const CONCURRENT_BUYERS = Number(process.env.CONCURRENT_BUYERS ?? 50);

if (!TICKET_TIER_ID) {
  console.error('Missing required env var: TICKET_TIER_ID');
  console.error('See the header comment in this file for full prerequisites.');
  process.exit(1);
}

async function registerTestBuyer(index) {
  const email = `loadtest-${Date.now()}-${index}@example.com`;
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'LoadTest123!',
      fullName: `Load Test Buyer ${index}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to register test buyer ${index}: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.accessToken;
}

async function attemptPurchase(accessToken) {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ticketTierId: TICKET_TIER_ID, quantity: 1 }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function main() {
  console.log(`Registering ${CONCURRENT_BUYERS} test buyer accounts...`);
  const tokens = [];
  // Registration itself is sequential (not the thing under test, and hitting
  // the auth rate limiter concurrently would just produce noise) — only the
  // purchase attempts below need to fire simultaneously.
  for (let i = 0; i < CONCURRENT_BUYERS; i++) {
    tokens.push(await registerTestBuyer(i));
  }

  console.log(`Firing ${CONCURRENT_BUYERS} concurrent purchase attempts at tier ${TICKET_TIER_ID}...`);
  const results = await Promise.all(tokens.map((token) => attemptPurchase(token)));

  const succeeded = results.filter((r) => r.status === 201);
  const soldOut = results.filter((r) => r.status === 409 && r.body.error?.code === 'SOLD_OUT');
  const unexpected = results.filter(
    (r) => r.status !== 201 && !(r.status === 409 && r.body.error?.code === 'SOLD_OUT'),
  );

  console.log('\n--- Results ---');
  console.log(`Succeeded (201):        ${succeeded.length}`);
  console.log(`Correctly sold out (409): ${soldOut.length}`);
  console.log(`Unexpected responses:    ${unexpected.length}`);

  if (unexpected.length > 0) {
    console.log('\nUnexpected responses (first 5):');
    unexpected.slice(0, 5).forEach((r) => console.log(JSON.stringify(r)));
  }

  const pass =
    succeeded.length === Math.min(EXPECTED_AVAILABLE, CONCURRENT_BUYERS) && unexpected.length === 0;

  console.log(
    `\nExpected exactly ${Math.min(EXPECTED_AVAILABLE, CONCURRENT_BUYERS)} successful purchases.`,
  );
  console.log(pass ? '\n✅ PASS — no overselling under concurrent load.' : '\n❌ FAIL — see above.');

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error('Load test crashed:', err);
  process.exit(1);
});
