import crypto from 'crypto';

// Prefix distinguishes order payments from future venue-deposit payments in
// the shared webhook handler (Issue #15) without needing a DB lookup first —
// see docs/ARCHITECTURE.md 3.4.
export function generateOrderPaymentReference(): string {
  return `TIX-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

export function generateVenueBookingPaymentReference(): string {
  return `VEN-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}
