import { z } from 'zod';

export const checkInSchema = z.object({
  remarks: z.string().optional(),
});

export const checkOutSchema = z.object({
  remarks: z.string().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
