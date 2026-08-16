import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { orderRateLimiter } from '../middleware/rate-limit';
import { createOrderSchema } from '../services/order.schemas';

const router = Router();

// Order creation is exactly the kind of endpoint bots hammer to grab
// inventory — see middleware/rate-limit.ts for why this has its own tier
// rather than sharing the stricter auth limiter.
router.post('/', requireAuth, orderRateLimiter, validateBody(createOrderSchema), orderController.create);

export default router;
