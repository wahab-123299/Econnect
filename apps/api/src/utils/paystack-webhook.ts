import crypto from 'crypto';

// Paystack signs the raw request body with your secret key using HMAC-SHA512.
// MUST be computed over the exact raw bytes Paystack sent — this is why the
// webhook route has to be mounted with express.raw(), not express.json(),
// before any body-parsing middleware touches it (see server.ts).
export function verifyPaystackSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signatureHeader) return false;

  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
