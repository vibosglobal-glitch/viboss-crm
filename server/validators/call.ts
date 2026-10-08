import { z } from 'zod';

const callBodySchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  leadName: z.string().max(200).optional(),
  agentName: z.string().max(200).optional(),
  date: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
  time: z.string().max(50).optional(),
  duration: z.union([z.number().min(0), z.string().max(50)]).optional(),
  outcome: z.string().max(100).optional(),
  notes: z.string().max(10000).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  contactNumber: z.string().max(100).optional(),
  recordingUrl: z.string().max(2000).optional().or(z.null()),
  hasRecording: z.boolean().optional(),
  status: z.string().max(50).optional(),
});

const updateCallBodySchema = z.object({
  leadName: z.string().max(200).optional(),
  agentName: z.string().max(200).optional(),
  date: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
  time: z.string().max(50).optional(),
  duration: z.union([z.number().min(0), z.string().max(50)]).optional(),
  outcome: z.string().max(100).optional(),
  notes: z.string().max(10000).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  contactNumber: z.string().max(100).optional(),
  recordingUrl: z.string().max(2000).optional().or(z.null()),
  hasRecording: z.boolean().optional(),
  status: z.string().max(50).optional(),
});

export const createCallSchema = z.object({
  body: callBodySchema,
  query: z.any(),
  params: z.any(),
});

export const updateCallSchema = z.object({
  body: updateCallBodySchema,
  query: z.any(),
  params: z.object({ id: z.string().uuid().optional() }).passthrough(),
});

export const updateRecordingSchema = z.object({
  body: z.object({
    recordingUrl: z.string().min(1, 'recordingUrl is required').max(2000),
  }),
  query: z.any(),
  params: z.object({ id: z.string().uuid().optional() }).passthrough(),
});
