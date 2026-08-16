import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';

export const orderController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketTierId, quantity } = req.body;
      const result = await orderService.createOrder(req.user!.id, ticketTierId, quantity);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
};
