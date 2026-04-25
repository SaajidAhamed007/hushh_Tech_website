import { z } from 'zod';

/**
 * Career Application Request Schema
 * Validates career application form submission
 */
export const careerApplicationSchema = z.object({
  firstName: z.string().min(1).describe('First name'),
  lastName: z.string().min(1).describe('Last name'),
  email: z.string().email().describe('Personal email'),
  collegeEmail: z.string().email().describe('College email'),
  officialEmail: z.string().email().describe('Official email'),
  phone: z.string().min(1).describe('Phone number'),
  resumeLink: z.string().url().describe('Resume URL'),
  college: z.string().min(1).describe('College name'),
  collegeValue: z.enum(['LPU', 'MIT']).optional().describe('Allowed college value'),
  jobTitle: z.string().optional().describe('Job title'),
  jobLocation: z.string().optional().describe('Job location'),
  submittedAt: z.string().datetime().optional().describe('Submission timestamp'),
}).strict().refine(
  (data) => {
    const collegeValue = data.collegeValue || data.college;
    return ['LPU', 'MIT'].includes(collegeValue);
  },
  {
    message: 'College must be LPU or MIT',
    path: ['college'],
  }
);

/**
 * Career Application Response Schema
 */
export const careerApplicationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    collegeEmail: z.string(),
    officialEmail: z.string(),
    phone: z.string(),
    resumeLink: z.string(),
    college: z.string(),
    jobTitle: z.string().optional(),
    jobLocation: z.string().optional(),
    submittedAt: z.string(),
    appsScript: z.record(z.any()).optional(),
  }),
});
