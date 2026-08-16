import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyPaystackSignature } from './paystack-webhook';

const SECRET = process.env.PAYSTACK_SECRET_KEY!;

function sign(body: string): string {
  return crypto.createHmac('sha512', SECRET).update(body).digest('hex');
}

describe('verifyPaystackSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
    const signature = sign(body.toString());
    expect(verifyPaystackSignature(body, signature)).toBe(true);
  });

  it('rejects a body that does not match the signature', () => {
    const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
    const wrongSignature = sign('{"event":"something else"}');
    expect(verifyPaystackSignature(body, wrongSignature)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
    expect(verifyPaystackSignature(body, undefined)).toBe(false);
  });

  it('rejects when no secret key is configured', () => {
    const original = process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_SECRET_KEY;
    const body = Buffer.from('{}');
    expect(verifyPaystackSignature(body, 'anything')).toBe(false);
    process.env.PAYSTACK_SECRET_KEY = original;
  });
});
