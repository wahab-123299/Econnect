import { describe, it, expect } from 'vitest';
import { generateQrSignature, verifyQrSignature } from './qr-ticket';

describe('QR signature', () => {
  it('generates a signature that verifies successfully', () => {
    const ticketId = 'ticket-abc-123';
    const signature = generateQrSignature(ticketId);
    const result = verifyQrSignature(signature);

    expect(result.valid).toBe(true);
    expect(result.ticketId).toBe(ticketId);
  });

  it('rejects a tampered ticket id with the original signature', () => {
    const signature = generateQrSignature('ticket-real');
    const [, hmac] = signature.split('.');
    const tampered = `ticket-forged.${hmac}`;

    expect(verifyQrSignature(tampered).valid).toBe(false);
  });

  it('rejects a malformed payload with no signature part', () => {
    expect(verifyQrSignature('not-a-valid-payload').valid).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(verifyQrSignature('').valid).toBe(false);
  });

  it('produces different signatures for different ticket ids', () => {
    const a = generateQrSignature('ticket-a');
    const b = generateQrSignature('ticket-b');
    expect(a).not.toBe(b);
  });
});
