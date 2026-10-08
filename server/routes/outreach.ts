import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOutreachSchema } from '../validators/outreach.js';
import { buildDateRange } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';
import { USER_PUBLIC_SELECT } from '../lib/selects.js';

const router = Router();

// ═══ GET /api/outreach ═══
router.get('/', authenticateToken, checkPermission('outreach', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    const where: Prisma.OutreachWhereInput = {};
    const role = req.user!.role;
    if (role === 'sdr' || role === 'closer') where.userId = req.user!.id;
    const dateRange = buildDateRange(dateFrom, dateTo);
    if (dateRange) {
      where.dateSent = dateRange;
    }

    const outreachRecords = await prisma.outreach.findMany({
      where,
      include: {
        user: { select: USER_PUBLIC_SELECT },
      },
      orderBy: { dateSent: 'desc' },
    });

    // Aggregate stats
    const totalEmails = outreachRecords.reduce((sum, o) => sum + o.emailsSent, 0);
    const totalReplies = outreachRecords.reduce((sum, o) => sum + (o.replies || 0), 0);
    const totalBounced = outreachRecords.reduce((sum, o) => sum + (o.bounced || 0), 0);

    res.json({
      records: outreachRecords,
      stats: {
        totalEmails,
        totalReplies,
        totalBounced,
        replyRate: totalEmails > 0 ? Math.round((totalReplies / totalEmails) * 100) : 0,
      },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/outreach error');
  }
});

// ═══ POST /api/outreach ═══
router.post('/', authenticateToken, checkPermission('outreach', 'create'), validate(createOutreachSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { emailsSent, replies, bounced, dateSent, platform, campaignName, notes } = req.body;
    if (!emailsSent || emailsSent < 1) return res.status(400).json({ error: 'emailsSent must be at least 1' });

    const sentDate = dateSent ? new Date(dateSent) : new Date();
    if (Number.isNaN(sentDate.getTime())) return res.status(400).json({ error: 'dateSent must be a valid date' });

    // Upsert: if a record for this user+date+platform exists, update it
    const startOfDay = new Date(sentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.outreach.findFirst({
      where: {
        userId: req.user!.id,
        platform: platform || 'email',
        dateSent: { gte: startOfDay, lte: endOfDay },
      },
    });

    let record;
    if (existing) {
      record = await prisma.outreach.update({
        where: { id: existing.id },
        data: {
          emailsSent: existing.emailsSent + emailsSent,
          replies: (existing.replies || 0) + (replies || 0),
          bounced: (existing.bounced || 0) + (bounced || 0),
          campaignName: campaignName || existing.campaignName,
          notes: notes || existing.notes,
        },
        include: { user: { select: USER_PUBLIC_SELECT } },
      });
    } else {
      record = await prisma.outreach.create({
        data: {
          userId: req.user!.id,
          emailsSent,
          replies: replies || 0,
          bounced: bounced || 0,
          dateSent: sentDate,
          platform: platform || 'email',
          campaignName: campaignName || '',
          notes: notes || '',
        },
        include: { user: { select: USER_PUBLIC_SELECT } },
      });
    }

    res.status(201).json(record);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/outreach error');
  }
});

export default router;
