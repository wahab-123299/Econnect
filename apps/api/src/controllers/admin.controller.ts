import { Request, Response, NextFunction } from 'express';
import { organizerService } from '../services/organizer.service';

export const adminController = {
  async listPendingOrganizers(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await organizerService.listPending();
      res.status(200).json({ organizers: result });
    } catch (err) {
      next(err);
    }
  },

  async verifyOrganizer(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, notes } = req.body as { action: 'approve' | 'reject'; notes?: string };
      const result = await organizerService.verify(req.params.id, req.user!.id, action, notes);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
