import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const base = 'http://localhost:4000/api/v1';

const rl = readline.createInterface({ input, output });
const buyerEmail = (await rl.question('Email of the account that bought the ticket: ')).trim();
const buyerPassword = await rl.question('Its password (it will show as you type): ');
rl.close();

async function login(emailOrPhone, password) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrPhone, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${emailOrPhone}: ${body.error?.message}`);
  return body.accessToken;
}

const buyerToken = await login(buyerEmail, buyerPassword);
const ticketsRes = await fetch(`${base}/me/tickets`, {
  headers: { Authorization: `Bearer ${buyerToken}` },
});
const { tickets } = await ticketsRes.json();
const ticket = tickets.find((t) => t.status === 'unused');
if (!ticket) {
  console.log('No unused ticket found for that account.');
  process.exit(1);
}
console.log(`Found an unused ticket for "${ticket.event.title}".`);

const organizerToken = await login('organizer5@example.com', 'TestPass123');

async function scan(label) {
  const res = await fetch(`${base}/organizers/events/${ticket.event.id}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organizerToken}`,
    },
    body: JSON.stringify({ qrSignature: ticket.qrSignature }),
  });
  console.log(label, res.status, JSON.stringify(await res.json()));
}

await scan('First scan: ');
await scan('Second scan:');