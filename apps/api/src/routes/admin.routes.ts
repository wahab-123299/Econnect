import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { adminVenueController } from '../controllers/admin-venue.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { uploadVenuePhoto, uploadVenueVideo } from '../middleware/upload';
import { verifyOrganizerSchema } from '../services/organizer.schemas';
import {
  createVenueOwnerSchema,
  createVenueSchema,
  updateVenueSchema,
} from '../services/venue.schemas';
import { reviewBookingSchema } from '../services/venue-booking.schemas';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/organizers', adminController.listPendingOrganizers);
router.patch(
  '/organizers/:id/verify',
  validateBody(verifyOrganizerSchema),
  adminController.verifyOrganizer,
);

router.post(
  '/venue-owners',
  validateBody(createVenueOwnerSchema),
  adminVenueController.createOwner,
);
router.post('/venues', validateBody(createVenueSchema), adminVenueController.createVenue);
router.get('/venues/:id', adminVenueController.getVenue);
router.patch('/venues/:id', validateBody(updateVenueSchema), adminVenueController.updateVenue);
router.post('/venues/:id/photos', uploadVenuePhoto, adminVenueController.uploadPhoto);
router.post('/venues/:id/video', uploadVenueVideo, adminVenueController.uploadVideo);

router.get('/venue-bookings', adminVenueController.listBookings);
router.patch(
  '/venue-bookings/:id',
  validateBody(reviewBookingSchema),
  adminVenueController.reviewBooking,
);

export default router;
