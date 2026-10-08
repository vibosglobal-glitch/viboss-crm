import { Router, Response } from 'express';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTaskSchema, updateTaskSchema } from '../validators/task.js';
import { parsePagination } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';
import { USER_PUBLIC_SELECT } from '../lib/selects.js';

const router = Router();

// ═══ GET /api/tasks ═══
router.get('/', authenticateToken, checkPermission('tasks', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, search } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.TaskWhereInput = {};
    const role = req.user!.role;
    const isPrivileged = role === 'admin' || role === 'manager';
    const andFilters: Prisma.TaskWhereInput[] = [];

    if (!isPrivileged) {
      andFilters.push({
        OR: [
          { assignedToId: null },
          { assignedToId: req.user!.id },
          { createdById: req.user!.id },
        ],
      });
    }

    if (status) {
      if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
        return res.status(400).json({ error: 'Invalid task status filter' });
      }
      andFilters.push({ status: status as TaskStatus });
    }
    if (priority) {
      if (!Object.values(TaskPriority).includes(priority as TaskPriority)) {
        return res.status(400).json({ error: 'Invalid task priority filter' });
      }
      andFilters.push({ priority: priority as TaskPriority });
    }
    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignedTo: { select: USER_PUBLIC_SELECT },
          createdBy: { select: { id: true, name: true } as const },
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      tasks,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/tasks error');
  }
});

// ═══ GET /api/tasks/:id ═══
router.get('/:id', authenticateToken, checkPermission('tasks', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        assignedTo: { select: USER_PUBLIC_SELECT },
        createdBy: { select: { id: true, name: true } as const },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    const role = req.user!.role;
    const canRead =
      role === 'admin' ||
      role === 'manager' ||
      task.assignedToId === null ||
      task.assignedToId === req.user!.id ||
      task.createdById === req.user!.id;

    if (!canRead) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(task);
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/tasks/:id error');
  }
});

// ═══ POST /api/tasks ═══
router.post('/', authenticateToken, checkPermission('tasks', 'create'), validate(createTaskSchema), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      assignedToId: assignedToIdFromBody,
      assignedToIds,
      leadId,
      leadName,
      category,
      status,
    } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const requestedAssigneeIds = Array.isArray(assignedToIds)
      ? Array.from(new Set(assignedToIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)))
      : [];

    // Legacy fallback for single assignee payloads.
    let fallbackAssignedToId: string | null = assignedToIdFromBody ?? assignedTo ?? null;
    if (assignedTo && typeof assignedTo === 'string' && assignedTo.length !== 36) {
      const user = await prisma.user.findFirst({ where: { name: assignedTo } });
      fallbackAssignedToId = user?.id || null;
    }

    const targetAssigneeIds = requestedAssigneeIds.length > 0
      ? requestedAssigneeIds
      : (fallbackAssignedToId ? [fallbackAssignedToId] : []);

    const taskData = {
      title,
      description: description || '',
      priority: priority || 'medium',
      status: status || 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: req.user!.id,
      leadId: leadId || null,
      leadName: leadName || null,
      category: category || 'other',
    } as const;

    if (targetAssigneeIds.length > 1) {
      const createdTasks = await prisma.$transaction(async (tx) => Promise.all(
        targetAssigneeIds.map((userId) => tx.task.create({
          data: {
            ...taskData,
            assignedToId: userId,
          },
          include: {
            assignedTo: { select: USER_PUBLIC_SELECT },
            createdBy: { select: { id: true, name: true } as const },
            lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          },
        }))
      ));

      return res.status(201).json({
        ...createdTasks[0],
        batchCreated: createdTasks.length,
      });
    }

    const task = await prisma.task.create({
      data: {
        ...taskData,
        assignedToId: targetAssigneeIds[0] || null,
      },
      include: {
        assignedTo: { select: USER_PUBLIC_SELECT },
        createdBy: { select: { id: true, name: true } as const },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    res.status(201).json(task);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/tasks error');
  }
});

// ═══ PUT /api/tasks/:id ═══
router.put('/:id', authenticateToken, checkPermission('tasks', 'edit'), validate(updateTaskSchema), async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: (req.params.id as string) } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && task.assignedToId !== req.user!.id && task.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, priority, dueDate, assignedTo, assignedToId, leadId, leadName, category, status } = req.body;
    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) data.status = status;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (leadId !== undefined) data.leadId = leadId || null;
    if (leadName !== undefined) data.leadName = leadName || null;
    if (category !== undefined) data.category = category || 'other';

    const assignee = assignedToId ?? assignedTo;
    if (assignee !== undefined) {
      if (!assignee) {
        data.assignedToId = null;
      } else if (assignee.length === 36) {
        data.assignedToId = assignee;
      } else {
        const user = await prisma.user.findFirst({ where: { name: assignee } });
        data.assignedToId = user?.id || null;
      }
    }

    if (data.status === 'completed' && task.status !== 'completed') {
      data.completedAt = new Date();
    }

    const updated = await prisma.task.update({
      where: { id: (req.params.id as string) },
      data,
      include: {
        assignedTo: { select: USER_PUBLIC_SELECT },
        createdBy: { select: { id: true, name: true } as const },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/tasks/:id error');
  }
});

// ═══ DELETE /api/tasks/:id ═══
router.delete('/:id', authenticateToken, checkPermission('tasks', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: (req.params.id as string) } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && task.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.task.delete({ where: { id: (req.params.id as string) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    return sendRouteError(res, err, 'DELETE /api/tasks/:id error');
  }
});

export default router;
