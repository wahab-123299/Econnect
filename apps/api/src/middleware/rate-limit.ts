import rateLimit from 'express-rate-limit';

function limiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' } },
  });
}

// Applied per-IP. Login/register are the endpoints most attractive to brute
// force / credential-stuffing bots — see docs/ARCHITECTURE.md 3.8.
export const authRateLimiter = limiter(60 * 1000, 5);

// Order creation is a bot target too (scalping bots hammering for
// inventory), but a real attendee occasionally retrying a failed checkout
// shouldn't get locked out as fast as a brute-force login attempt would —
// slightly more headroom than auth.
export const orderRateLimiter = limiter(60 * 1000, 10);

// Door staff scanning tickets is a LEGITIMATE high-throughput use case — a
// queue of guests at a busy event could mean a scan every couple of
// seconds for several minutes straight. This must not share the auth
// limiter's budget or real check-in traffic gets throttled.
export const scanRateLimiter = limiter(60 * 1000, 120);

// Venue booking requests are infrequent by nature (an organizer sends a
// handful of these per event, not dozens), so a moderate cap is plenty
// while still blocking automated spam of booking requests.
export const bookingRateLimiter = limiter(60 * 1000, 15);
