import { Request, Response, NextFunction } from 'express';
import { organizerService } from '../services/organizer.service';

export const organizerController = {
  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await organizerService.apply(req.user!.id, req.body.businessName);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await organizerService.getMyProfile(req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
