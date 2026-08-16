import { z } from 'zod';

export const createVenueOwnerSchema = z.object({
  businessName: z.string().min(2).max(255),
  contactPhone: z.string().min(7).max(20),
});

const koboAmount = z
  .string()
  .regex(/^\d+$/, 'Must be a non-negative whole number of kobo')
  .transform((v) => BigInt(v));

export const createVenueSchema = z.object({
  venueOwnerId: z.string().uuid(),
  name: z.string().min(2).max(255),
  description: z.string().max(5000).optional(),
  // Free text, not a fixed enum — venue types vary widely (pool party
  // spaces, conference halls, wedding gardens, event centres) and a hard
  // enum would need a migration every time a new type shows up. Same
  // pattern as event categories.
  category: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().positive().optional(),
  basePriceKobo: koboAmount.optional(),
});

export const updateVenueSchema = z
  .object({
    name: z.string().min(2).max(255),
    description: z.string().max(5000),
    category: z.string().max(100),
    address: z.string().max(500),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    capacity: z.number().int().positive(),
    basePriceKobo: koboAmount,
  })
  .partial();
