import { z } from 'zod';

const outreachBodySchema = z.object({
  emailsSent: z.number().int().min(1, 'emailsSent must be at least 1').max(100000),
  replies: z.number().int().min(0).optional().default(0),
  bounced: z.number().int().min(0).optional().default(0),
  dateSent: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid dateSent'),
  platform: z.string().max(50).optional().default('email'),
  campaignName: z.string().max(200).optional().default(''),
  notes: z.string().max(10000).optional().default(''),
});

export const createOutreachSchema = z.object({
  body: outreachBodySchema,
  query: z.any(),
  params: z.any(),
});
