import { Request, Response, NextFunction } from 'express';
import { publicEventService } from '../services/public-event.service';

export const publicEventController = {
  async browse(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await publicEventService.browse(res.locals.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await publicEventService.getById(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
