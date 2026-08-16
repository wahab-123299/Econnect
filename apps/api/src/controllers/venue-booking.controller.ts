import { Request, Response, NextFunction } from 'express';
import { venueBookingService } from '../services/venue-booking.service';

export const venueBookingController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await venueBookingService.createBooking(req.user!.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await venueBookingService.listMyBookings(req.user!.id);
      res.status(200).json({ bookings: result });
    } catch (err) {
      next(err);
    }
  },

  async payDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await venueBookingService.payDeposit(req.params.id, req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
