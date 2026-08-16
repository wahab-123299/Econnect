import { Router } from 'express';
import { publicEventController } from '../controllers/public-event.controller';
import { validateQuery } from '../middleware/validate';
import { browseEventsQuerySchema } from '../services/public-event.schemas';

const router = Router();

router.get('/', validateQuery(browseEventsQuerySchema), publicEventController.browse);
router.get('/:id', publicEventController.getById);

export default router;
