import { describe, it, expect } from 'vitest';
import { reviewBookingSchema } from './venue-booking.schemas';

describe('reviewBookingSchema', () => {
  it('rejects accept without a deposit amount', () => {
    const result = reviewBookingSchema.safeParse({ action: 'accept' });
    expect(result.success).toBe(false);
  });

  it('accepts accept with a valid deposit amount', () => {
    const result = reviewBookingSchema.safeParse({ action: 'accept', depositAmountKobo: '100000' });
    expect(result.success).toBe(true);
  });

  it('allows decline without a deposit amount', () => {
    const result = reviewBookingSchema.safeParse({ action: 'decline' });
    expect(result.success).toBe(true);
  });
});
