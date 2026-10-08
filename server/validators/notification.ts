import { z } from 'zod';

const notificationBodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  type: z.string().max(50).optional().default('info'),
  relatedLeadId: z.string().uuid('Invalid lead ID').optional().or(z.null()),
  userId: z.string().uuid('Invalid user ID').optional(),
});

export const createNotificationSchema = z.object({
  body: notificationBodySchema,
  query: z.any(),
  params: z.any(),
});
