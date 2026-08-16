import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { uploadService } from '../services/upload.service';
import { AppError } from '../middleware/error-handler';

export const eventController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketTiers, ...basics } = req.body;
      const result = await eventService.createDraft(req.user!.id, basics, ticketTiers);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await eventService.updateEvent(req.params.id, req.user!.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await eventService.publish(req.params.id, req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getForEdit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await eventService.getForEdit(req.params.id, req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async uploadFlyer(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(422, 'VALIDATION_ERROR', 'No image file was provided.');
      }
      // Ownership is verified inside updateEvent, but we check first here too
      // so we don't burn a Cloudinary upload on a request that will fail anyway.
      await eventService.getForEdit(req.params.id, req.user!.id);

      const { url } = await uploadService.uploadImageBuffer(req.file.buffer, 'econnect/flyers');
      const updated = await eventService.updateEvent(req.params.id, req.user!.id, {
        flyerUrl: url,
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
};
