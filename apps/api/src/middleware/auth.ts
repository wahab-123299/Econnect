import { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyAccessToken } from '../utils/tokens';
import { AppError } from './error-handler';

// Verifies the JWT access token and attaches { id, role } to req.user.
// Does NOT touch the database — the token payload is trusted as-is for the
// lifetime of the access token (15 min), which is the standard JWT tradeoff:
// fast, stateless auth checks at the cost of up-to-15-minute staleness if a
// role changes or an account is disabled. That's an acceptable tradeoff for
// v1; anything requiring instant revocation (e.g. banning a user mid-session)
// would need a token blocklist, which we can add later if it becomes a problem.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid Authorization header.');
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired access token.');
  }
}

// Usage: router.post('/events', requireAuth, requireRole('organizer'), ...)
// Always chain AFTER requireAuth — this only checks req.user.role, it doesn't
// verify the token itself.
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to do this.');
    }
    next();
  };
}
