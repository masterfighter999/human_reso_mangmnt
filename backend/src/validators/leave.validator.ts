import { z } from 'zod';

export const applyLeaveSchema = z.object({
  leave_type_id: z.string().uuid('Invalid leave type ID'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  remarks: z.string().optional(),
}).refine(data => {
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: 'End date must be greater than or equal to start date',
  path: ['end_date']
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  review_comments: z.string().optional(),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
