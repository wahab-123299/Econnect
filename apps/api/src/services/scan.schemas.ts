import { z } from 'zod';

export const scanTicketSchema = z.object({
  qrSignature: z.string().min(1, 'qrSignature is required'),
});
