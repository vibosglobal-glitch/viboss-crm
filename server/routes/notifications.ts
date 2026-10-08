import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { parsePagination, parseBooleanQuery } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

// ═══ GET /api/notifications ═══
router.get('/', authenticateToken, checkPermission('notifications', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { unreadOnly } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>, { limit: 20 });
    const unreadOnlyBool = parseBooleanQuery(unreadOnly);

    const where: Prisma.NotificationWhereInput = { userId: req.user!.id };
    if (unreadOnlyBool === true) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/notifications error');
  }
});

// ═══ PUT /api/notifications/read-all ═══
router.put('/read-all', authenticateToken, checkPermission('notifications', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/notifications/read-all error');
  }
});

// ═══ PUT /api/notifications/:id/read ═══
router.put('/:id/read', authenticateToken, checkPermission('notifications', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: (req.params.id as string) } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.userId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.notification.update({
      where: { id: (req.params.id as string) },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/notifications/:id/read error');
  }
});

export default router;
