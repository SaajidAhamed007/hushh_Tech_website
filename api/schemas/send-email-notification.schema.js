import { z } from 'zod';

/**
 * Send Email Notification Request Schema
 * Validates incoming request body for email notifications
 * 
 * Two modes:
 * 1. Test mode: Only testEmail required
 * 2. Normal mode: type + slug required
 */
export const sendEmailNotificationSchema = z.object({
  type: z.enum(['profile_view', 'payment_received']).optional().describe('Type of email notification'),
  slug: z.string().min(1).optional().describe('Public profile slug'),
  profileOwnerEmail: z.string().email().optional().describe('Override profile owner email'),
  profileName: z.string().optional().describe('Override profile name'),
  testEmail: z.string().email().optional().describe('Send test email to this address'),
}).strict().refine(
  (data) => {
    // If testEmail is provided, it's valid (test mode)
    if (data.testEmail) return true;
    // Otherwise, require type and slug
    return data.type && data.slug;
  },
  {
    message: 'Either testEmail OR (type + slug) must be provided',
    path: ['type'], // Show error at type field
  }
);

/**
 * Send Email Notification Response Schema
 */
export const sendEmailNotificationResponseSchema = z.object({
  success: z.boolean(),
  emailSent: z.boolean().optional(),
  message: z.string().optional(),
}).strict();
