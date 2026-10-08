import { z } from 'zod';

const noteBodySchema = z.object({
  leadId: z.string().uuid('Invalid lead ID').optional().or(z.null()),
  content: z.string().min(1, 'Content is required').max(50000),
  type: z.string().max(50).optional().default('general'),
});

export const createNoteSchema = z.object({
  body: noteBodySchema,
  query: z.any(),
  params: z.any(),
});
