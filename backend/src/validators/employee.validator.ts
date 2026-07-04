import { z } from 'zod';

export const updateEmployeeSchema = z.object({
  address: z.string().optional(),
  phone: z.string().optional(),
  // Additional fields restricted for admins to update
  department: z.string().optional(),
  designation: z.string().optional(),
  date_of_joining: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  nationality: z.string().optional(),
  personal_email: z.string().email().optional(),
  residing_address: z.string().optional(),
  about_me: z.string().optional(),
  // For JSONB fields, accept them as any or proper schema depending on complexity
  skills: z.any().optional(),
  certifications: z.any().optional(),
  interests: z.any().optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
