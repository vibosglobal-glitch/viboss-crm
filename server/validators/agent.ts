import { z } from 'zod';

const agentBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['sdr', 'closer', 'lead_gen', 'manager', 'hr', 'admin']),
  phone: z.string().max(100).optional().or(z.literal('')),
  avatar: z.string().max(500).optional(),
  teamId: z.string().uuid('Invalid team ID').optional().or(z.null()),
});

const updateAgentBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email').max(254).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['sdr', 'closer', 'lead_gen', 'manager', 'hr', 'admin']).optional(),
  phone: z.string().max(100).optional().or(z.literal('')),
  avatar: z.string().max(500).optional(),
  teamId: z.string().uuid('Invalid team ID').optional().or(z.null()),
  isActive: z.boolean().optional(),
});

export const createAgentSchema = z.object({
  body: agentBodySchema,
  query: z.any(),
  params: z.any(),
});

export const updateAgentSchema = z.object({
  body: updateAgentBodySchema,
  query: z.any(),
  params: z.object({ id: z.string().uuid().optional() }).passthrough(),
});
