import { z } from 'zod';

export const createOrderSchema = z.object({
  ticketTierId: z.string().uuid(),
  // Capped at 10 per order — a soft anti-scalping measure. Not a complete
  // defense (someone can place multiple orders), but it stops the single
  // most obvious abuse case cheaply. Revisit if scalping becomes a real
  // problem once there's real traffic to observe.
  quantity: z.number().int().positive().max(10),
});
