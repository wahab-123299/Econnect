import { z } from 'zod';

export const applyAsOrganizerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').optional(),
});

export const verifyOrganizerSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
});
