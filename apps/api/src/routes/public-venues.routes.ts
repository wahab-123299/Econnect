import { Router } from 'express';
import { publicVenueController } from '../controllers/public-venue.controller';
import { validateQuery } from '../middleware/validate';
import { browseVenuesQuerySchema } from '../services/public-venue.schemas';

const router = Router();

router.get('/', validateQuery(browseVenuesQuerySchema), publicVenueController.browse);
router.get('/:id', publicVenueController.getById);

export default router;
