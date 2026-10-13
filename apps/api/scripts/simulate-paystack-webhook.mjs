import 'dotenv/config';
import crypto from 'crypto';

const reference = process.argv[2];
if (!reference) {
  console.error('Usage: node scripts/simulate-paystack-webhook.mjs <payment-reference>');
  process.exit(1);
}

const base = 'http://localhost:4000/api/v1';

// Find the first event and its first ticket tier
const list = await (await fetch(`${base}/events`)).json();
const eventId = list.events[0]?.id;
const detail = await (await fetch(`${base}/events/${eventId}`)).json();
const tierId = detail.ticketTiers[0].id;

// Build the same kind of message Paystack would send, and sign it the same way
const payload = JSON.stringify({
  event: 'charge.success',
  data: { reference, metadata: { ticketTierId: tierId, quantity: 1 } },
});
const signature = crypto
  .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
  .update(payload)
  .digest('hex');

const res = await fetch(`${base}/webhooks/paystack`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
  body: payload,
});
console.log('Webhook response:', res.status, await res.text());