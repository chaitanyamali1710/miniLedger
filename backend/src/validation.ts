import { z } from 'zod';

// Accepts numbers like +919876543210 or 9876543210 (8 to 15 digits, optional +).
export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .refine((s) => /^\+?\d{8,15}$/.test(s), 'Phone must be 8 to 15 digits, optionally starting with +');

export const requestOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

const isRealDate = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Amount comes as a number or a string (multipart forms send strings).
export const createLoanSchema = z.object({
  friendName: z.string().trim().min(1, 'Friend name is required').max(100),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Amount is too large')
    .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(6)), 'Amount can have at most 2 decimals'),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must look like YYYY-MM-DD')
    .refine(isRealDate, 'Due date is not a real date'),
});

export const idParamSchema = z.coerce.number().int().positive();
