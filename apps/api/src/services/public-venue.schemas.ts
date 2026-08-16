import { z } from 'zod';

export const browseVenuesQuerySchema = z.object({
  category: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
