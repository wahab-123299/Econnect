import { z } from 'zod';

// E.164-ish check: + followed by 8-15 digits. Good enough for v1; a dedicated
// phone-parsing library (libphonenumber-js) is worth adding once we support
// more than Nigerian numbers.
const phoneRegex = /^\+[1-9]\d{7,14}$/;

export const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().regex(phoneRegex, 'Phone must be in +234... format').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name is required'),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
    path: ['email'],
  });

export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
