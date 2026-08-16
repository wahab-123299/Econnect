// Basis points (1/100th of a percent) so the rate is an integer and every
// calculation stays in exact integer kobo math — no floating point anywhere
// near money. 1000 bps = 10%.
const VENUE_COMMISSION_BPS = process.env.VENUE_COMMISSION_BPS
  ? Number(process.env.VENUE_COMMISSION_BPS)
  : 1000;

export function calculateVenueSplit(depositAmountKobo: bigint): {
  platformFeeKobo: bigint;
  venuePayoutKobo: bigint;
} {
  const platformFeeKobo = (depositAmountKobo * BigInt(VENUE_COMMISSION_BPS)) / 10000n;
  const venuePayoutKobo = depositAmountKobo - platformFeeKobo;
  return { platformFeeKobo, venuePayoutKobo };
}
