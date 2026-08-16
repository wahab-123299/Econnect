import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticket.service';

export const ticketController = {
  async getMyTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const tickets = await ticketService.getMyTickets(req.user!.id);
      res.status(200).json({ tickets });
    } catch (err) {
      next(err);
    }
  },
};
