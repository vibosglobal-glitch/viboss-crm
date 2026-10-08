import { z } from 'zod';

const stageBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().max(50).optional().default('#6366f1'),
  order: z.number().int().min(0).max(1000).optional(),
  probability: z.number().min(0).max(100).optional(),
  description: z.string().max(500).optional(),
});

const updateStageBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(50).optional(),
  order: z.number().int().min(0).max(1000).optional(),
  probability: z.number().min(0).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const createStageSchema = z.object({
  body: stageBodySchema,
  query: z.any(),
  params: z.any(),
});

export const updateStageSchema = z.object({
  body: updateStageBodySchema,
  query: z.any(),
  params: z.object({ id: z.string().uuid().optional() }).passthrough(),
});
