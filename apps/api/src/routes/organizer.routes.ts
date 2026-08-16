import { Router } from 'express';
import { organizerController } from '../controllers/organizer.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { applyAsOrganizerSchema } from '../services/organizer.schemas';

const router = Router();

// Any authenticated user can apply to become an organizer — this is the
// self-serve entry point; verification (admin.routes.ts) is the gate that
// actually lets them create events.
router.post('/apply', requireAuth, validateBody(applyAsOrganizerSchema), organizerController.apply);
router.get('/me', requireAuth, organizerController.getMyProfile);

export default router;
