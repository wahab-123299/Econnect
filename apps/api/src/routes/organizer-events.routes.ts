import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { scanController } from '../controllers/scan.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { uploadSingleImage } from '../middleware/upload';
import { scanRateLimiter } from '../middleware/rate-limit';
import { createEventSchema, updateEventSchema } from '../services/event.schemas';
import { scanTicketSchema } from '../services/scan.schemas';

const router = Router();

router.use(requireAuth, requireRole('organizer'));

router.post('/', validateBody(createEventSchema), eventController.create);
router.get('/:id', eventController.getForEdit);
router.patch('/:id', validateBody(updateEventSchema), eventController.update);
router.post('/:id/flyer', uploadSingleImage, eventController.uploadFlyer);
router.post('/:id/publish', eventController.publish);
router.post('/:id/scan', scanRateLimiter, validateBody(scanTicketSchema), scanController.scan);

export default router;
