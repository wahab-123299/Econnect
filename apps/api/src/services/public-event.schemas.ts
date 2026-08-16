import { z } from 'zod';

export const browseEventsQuerySchema = z.object({
  category: z.string().max(100).optional(),
  search: z.string().max(255).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
