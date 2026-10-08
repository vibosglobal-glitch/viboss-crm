import { z } from 'zod';

const meetingBodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  leadId: z.string().uuid('Invalid lead ID').optional().or(z.null()),
  scheduledAt: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid scheduledAt date'),
  date: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
  time: z.string().optional(),
  duration: z.number().int().min(1).max(1440).optional().default(30),
  type: z.string().max(100).optional().default('call'),
  location: z.string().max(500).optional(),
  notes: z.string().max(10000).optional(),
  attendees: z.array(z.string().uuid()).optional(),
}).superRefine((body, ctx) => {
  if (!body.scheduledAt && !body.date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduledAt'],
      message: 'Either scheduledAt or date is required',
    });
  }
});

const updateMeetingBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  leadId: z.string().uuid('Invalid lead ID').optional().or(z.null()),
  scheduledAt: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid scheduledAt date'),
  duration: z.number().int().min(1).max(1440).optional(),
  type: z.string().max(100).optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(10000).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  outcome: z.string().max(500).optional(),
  attendees: z.array(z.string().uuid()).optional(),
});

export const createMeetingSchema = z.object({
  body: meetingBodySchema,
  query: z.any(),
  params: z.any(),
});

export const updateMeetingSchema = z.object({
  body: updateMeetingBodySchema,
  query: z.any(),
  params: z.object({ id: z.string().uuid().optional() }).passthrough(),
});
