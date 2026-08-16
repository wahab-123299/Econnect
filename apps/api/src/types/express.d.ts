import type { UserRole } from '@prisma/client';

// Augments Express's Request type so `req.user` is available and typed
// everywhere after requireAuth runs, without needing `as` casts in controllers.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export {};
