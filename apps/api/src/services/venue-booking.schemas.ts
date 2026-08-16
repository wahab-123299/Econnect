import { z } from 'zod';

const koboAmount = z
  .string()
  .regex(/^\d+$/, 'Must be a non-negative whole number of kobo')
  .transform((v) => BigInt(v));

export const createBookingSchema = z.object({
  venueId: z.string().uuid(),
  proposedDate: z.coerce.date(),
  proposedBudgetKobo: koboAmount.optional(),
  eventId: z.string().uuid().optional(),
});

// depositAmountKobo is required when accepting (the admin/venue owner is
// setting the deposit the organizer will owe) and ignored when declining —
// enforced with a refine rather than two separate schemas, so the frontend
// gets one clean 422 with a field-level message instead of a generic error.
export const reviewBookingSchema = z
  .object({
    action: z.enum(['accept', 'decline']),
    depositAmountKobo: koboAmount.optional(),
  })
  .refine((data) => data.action !== 'accept' || data.depositAmountKobo !== undefined, {
    message: 'depositAmountKobo is required when accepting a booking',
    path: ['depositAmountKobo'],
  });
