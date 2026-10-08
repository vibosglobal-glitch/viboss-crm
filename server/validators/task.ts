import { z } from 'zod';

const taskBodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(10000).optional(),
  leadId: z.string().uuid('Invalid lead ID').optional().or(z.null()),
  assignedToId: z.string().uuid('Invalid user ID').optional().or(z.null()),
  assignedToIds: z.array(z.string().uuid('Invalid user ID')).optional(),
  assignedTo: z.string().max(200).optional().or(z.null()),
  dueDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid due date'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
  type: z.string().max(50).optional(),
  leadName: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
});

const updateTaskBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  leadId: z.string().uuid('Invalid lead ID').optional().or(z.null()),
  assignedToId: z.string().uuid('Invalid user ID').optional().or(z.null()),
  assignedToIds: z.array(z.string().uuid('Invalid user ID')).optional(),
  assignedTo: z.string().max(200).optional().or(z.null()),
  dueDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid due date'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  isCompleted: z.boolean().optional(),
  type: z.string().max(50).optional(),
  leadName: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
});

export const createTaskSchema = z.object({
  body: taskBodySchema,
  query: z.any(),
  params: z.any(),
});

export const updateTaskSchema = z.object({
  body: updateTaskBodySchema,
  query: z.any(),
  params: z.object({ id: z.string().uuid().optional() }).passthrough(),
});
