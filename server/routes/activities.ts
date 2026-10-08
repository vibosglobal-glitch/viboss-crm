import { Router, Response } from 'express';
import { ActivityType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { USER_SELECT } from '../lib/selects.js';
import { parsePagination, buildDateRange } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

// ═══ POST /api/activities ═══
router.post('/', authenticateToken, checkPermission('activities', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, type, description, metadata, scheduledAt, isCompleted } = req.body;
    if (!type) return res.status(400).json({ error: 'type is required' });

    const data: Prisma.ActivityUncheckedCreateInput = {
      userId: req.user!.id,
      type,
      description: description || '',
      metadata: metadata || undefined,
      isCompleted: isCompleted || false,
    };
    if (leadId) data.leadId = leadId;
    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);

    const activity = await prisma.activity.create({
      data,
      include: {
        user: { select: USER_SELECT },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    res.status(201).json(activity);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/activities error');
  }
});

// ═══ GET /api/activities/feed ═══
router.get('/feed', authenticateToken, checkPermission('activities', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, leadId, dateFrom, dateTo } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.ActivityWhereInput = {};
    const role = req.user!.role;
    if (role === 'sdr' || role === 'closer') where.userId = req.user!.id;
    if (type) {
      if (!Object.values(ActivityType).includes(type as ActivityType)) {
        return res.status(400).json({ error: 'Invalid activity type' });
      }
      where.type = type as ActivityType;
    }
    if (leadId) where.leadId = leadId;
    const dateRange = buildDateRange(dateFrom, dateTo);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: { select: USER_SELECT },
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      activities,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/activities/feed error');
  }
});

// ═══ GET /api/activities/my ═══
router.get('/my', authenticateToken, checkPermission('activities', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.ActivityWhereInput = { userId: req.user!.id };
    if (type) {
      if (!Object.values(ActivityType).includes(type as ActivityType)) {
        return res.status(400).json({ error: 'Invalid activity type' });
      }
      where.type = type as ActivityType;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      activities,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/activities/my error');
  }
});

// ═══ GET /api/activities/my/tasks ═══
router.get('/my/tasks', authenticateToken, checkPermission('activities', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const where: Prisma.ActivityWhereInput = {
      userId: req.user!.id,
      type: { in: [ActivityType.follow_up, ActivityType.cadence_touch] },
      isCompleted: false,
    };

    const activities = await prisma.activity.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(activities);
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/activities/my/tasks error');
  }
});

// ═══ GET /api/activities/lead/:leadId ═══
router.get('/lead/:leadId', authenticateToken, checkPermission('activities', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.ActivityWhereInput = { leadId: (req.params.leadId as string) };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      activities,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/activities/lead/:leadId error');
  }
});

// ═══ PATCH /api/activities/:id/complete ═══
router.patch('/:id/complete', authenticateToken, checkPermission('activities', 'complete'), async (req: AuthRequest, res: Response) => {
  try {
    const activity = await prisma.activity.findUnique({ where: { id: (req.params.id as string) } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && activity.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.activity.update({
      where: { id: (req.params.id as string) },
      data: { isCompleted: true, completedAt: new Date() },
      include: {
        user: { select: USER_SELECT },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PATCH /api/activities/:id/complete error');
  }
});

export default router;
