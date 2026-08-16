import { z } from 'zod';

// Money arrives as a string over JSON (BigInt doesn't serialize natively) —
// validate it's a non-negative integer string, then convert to BigInt.
const koboAmount = z
  .string()
  .regex(/^\d+$/, 'Must be a non-negative whole number of kobo')
  .transform((v) => BigInt(v));

const ticketTierSchema = z.object({
  name: z.string().min(1).max(100),
  priceKobo: koboAmount,
  quantityTotal: z.number().int().positive(),
  salesStart: z.coerce.date().optional(),
  salesEnd: z.coerce.date().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  locationName: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  startDatetime: z.coerce.date(),
  endDatetime: z.coerce.date().optional(),
  ticketTiers: z.array(ticketTierSchema).max(10).default([]),
});

// Partial update — everything optional, but if provided must still be valid.
// ticketTiers, if present, REPLACES the full set (see event.repository.ts note).
export const updateEventSchema = z
  .object({
    title: z.string().min(3).max(255),
    description: z.string().max(5000),
    category: z.string().max(100),
    locationName: z.string().max(255),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    startDatetime: z.coerce.date(),
    endDatetime: z.coerce.date(),
    flyerUrl: z.string().url(),
    ticketTiers: z.array(ticketTierSchema).max(10),
  })
  .partial();
