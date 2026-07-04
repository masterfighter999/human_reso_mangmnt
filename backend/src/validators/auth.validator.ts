import { z } from 'zod';

// ─── Password Rules ───────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name too long'),
  lastName:  z.string().trim().min(1, 'Last name is required').max(50, 'Last name too long'),
  role: z.enum(['admin', 'employee']).default('employee'),
});

export const loginSchema = z.object({
  email:    z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword:     passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type RegisterInput      = z.infer<typeof registerSchema>;
export type LoginInput         = z.infer<typeof loginSchema>;
export type RefreshTokenInput  = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
