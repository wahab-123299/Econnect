import { describe, it, expect } from 'vitest';
import { calculateVenueSplit } from './venue-commission';

describe('calculateVenueSplit', () => {
  it('splits a deposit at the default 10% rate with exact integer math', () => {
    const result = calculateVenueSplit(1000000n);
    expect(result.platformFeeKobo).toBe(100000n);
    expect(result.venuePayoutKobo).toBe(900000n);
  });

  it('platform fee plus venue payout always equals the original deposit', () => {
    const deposit = 333333n; // deliberately not evenly divisible
    const { platformFeeKobo, venuePayoutKobo } = calculateVenueSplit(deposit);
    expect(platformFeeKobo + venuePayoutKobo).toBe(deposit);
  });

  it('handles a zero deposit without error', () => {
    const result = calculateVenueSplit(0n);
    expect(result.platformFeeKobo).toBe(0n);
    expect(result.venuePayoutKobo).toBe(0n);
  });
});
