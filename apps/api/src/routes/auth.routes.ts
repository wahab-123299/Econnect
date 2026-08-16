import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rate-limit';
import { requireAuth } from '../middleware/auth';
import { registerSchema, loginSchema, refreshSchema } from '../services/auth.schemas';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshSchema), authController.refresh);
router.post('/logout', validateBody(refreshSchema), authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
