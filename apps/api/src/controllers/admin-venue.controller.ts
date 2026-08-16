import { Request, Response, NextFunction } from 'express';
import { venueService } from '../services/venue.service';
import { uploadService } from '../services/upload.service';
import { venueBookingService } from '../services/venue-booking.service';
import { AppError } from '../middleware/error-handler';

export const adminVenueController = {
  async createOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await venueService.createOwner(req.body.businessName, req.body.contactPhone);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async createVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await venueService.createVenue(req.user!.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async updateVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await venueService.updateVenue(req.params.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await venueService.getById(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(422, 'VALIDATION_ERROR', 'No image file was provided.');
      }
      const { url } = await uploadService.uploadImageBuffer(req.file.buffer, 'econnect/venues');
      const result = await venueService.addPhoto(req.params.id, url);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async uploadVideo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(422, 'VALIDATION_ERROR', 'No video file was provided.');
      }
      const { url } = await uploadService.uploadVideoBuffer(req.file.buffer, 'econnect/venues');
      const result = await venueService.setVideo(req.params.id, url);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async listBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as 'pending' | undefined;
      const result = await venueBookingService.listForAdmin(status);
      res.status(200).json({ bookings: result });
    } catch (err) {
      next(err);
    }
  },

  async reviewBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, depositAmountKobo } = req.body;
      const result = await venueBookingService.review(req.params.id, action, depositAmountKobo);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
