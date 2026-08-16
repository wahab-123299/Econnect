import { Request, Response, NextFunction } from 'express';
import { publicVenueService } from '../services/public-venue.service';

export const publicVenueController = {
  async browse(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await publicVenueService.browse(res.locals.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await publicVenueService.getById(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
