import crypto from 'crypto';

// Format: "<ticketId>.<hmac>" — the ticketId is embedded in the QR payload
// itself so the scan endpoint can recompute and verify the signature without
// needing to search the DB by an opaque string first. The DB lookup that
// follows is to check ticket STATUS (used/unused), not to establish
// authenticity — that's what the signature is for.
function sign(ticketId: string): string {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) {
    throw new Error('QR_SIGNING_SECRET is not configured');
  }
  return crypto.createHmac('sha256', secret).update(ticketId).digest('hex');
}

export function generateQrSignature(ticketId: string): string {
  return `${ticketId}.${sign(ticketId)}`;
}

export function verifyQrSignature(qrSignature: string): { valid: boolean; ticketId?: string } {
  const [ticketId, providedHmac] = qrSignature.split('.');
  if (!ticketId || !providedHmac) {
    return { valid: false };
  }

  const expectedHmac = sign(ticketId);
  const expectedBuf = Buffer.from(expectedHmac);
  const providedBuf = Buffer.from(providedHmac);

  // Constant-time comparison — a plain === here would leak timing
  // information an attacker could use to forge a valid signature byte by
  // byte. Buffers of different length would throw in timingSafeEqual, so
  // guard that first.
  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false };
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false };
  }

  return { valid: true, ticketId };
}
