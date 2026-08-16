import { Router } from 'express';
import { venueBookingController } from '../controllers/venue-booking.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { bookingRateLimiter, orderRateLimiter } from '../middleware/rate-limit';
import { createBookingSchema } from '../services/venue-booking.schemas';

const router = Router();

router.use(requireAuth, requireRole('organizer'));

router.post('/', bookingRateLimiter, validateBody(createBookingSchema), venueBookingController.create);
router.get('/', venueBookingController.listMine);
// pay-deposit initiates a real charge, same risk profile as ticket order
// creation — shares that tier rather than the (very different) booking one.
router.post('/:id/pay-deposit', orderRateLimiter, venueBookingController.payDeposit);

export default router;
