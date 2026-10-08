import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { USER_WITH_ROLE_SELECT, STAGE_CORE_SELECT } from '../lib/selects.js';
import { buildDateRange, parsePagination } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

function getLeadInclude(includeActivities = false) {
  return {
    assignedTo: { select: USER_WITH_ROLE_SELECT },
    uploader: { select: USER_WITH_ROLE_SELECT },
    pipelineStage: { select: STAGE_CORE_SELECT },
    calls: {
      select: {
        id: true,
        date: true,
        createdAt: true,
        status: true,
        agentName: true,
        notes: true,
        user: { select: USER_WITH_ROLE_SELECT },
      },
      orderBy: { date: 'desc' as const },
    },
    activities: includeActivities
      ? {
          select: {
            id: true,
            type: true,
            description: true,
            createdAt: true,
            user: { select: USER_WITH_ROLE_SELECT },
          },
          orderBy: { createdAt: 'desc' as const },
          take: 20,
        }
      : false,
  };
}

// ═══ GET /api/hr/dashboard ═══
router.get('/dashboard', authenticateToken, checkPermission('hr', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    const dateRange = buildDateRange(dateFrom, dateTo);
    const leadDateFilter = dateRange ? { createdAt: dateRange } : {};
    const callDateFilter = dateRange ? { date: dateRange } : {};
    const meetingDateFilter = dateRange ? { scheduledAt: dateRange } : {};
    const activityDateFilter = dateRange ? { createdAt: dateRange } : {};

    const agents = await prisma.user.findMany({
      where: { role: { in: ['sdr', 'closer', 'lead_gen'] }, isActive: true },
      select: USER_WITH_ROLE_SELECT,
    });

    const agentIds = agents.map(a => a.id);

    const [leadCounts, wonCounts, appointmentCounts, callCounts, meetingCounts, activityCounts] = await Promise.all([
      prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: agentIds }, isDeleted: false, ...leadDateFilter },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: agentIds }, isDeleted: false, status: 'Active Account', ...leadDateFilter },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: agentIds }, isDeleted: false, status: 'Appointment Set', ...leadDateFilter },
        _count: { id: true },
      }),
      prisma.call.groupBy({
        by: ['userId'],
        where: { userId: { in: agentIds }, ...callDateFilter },
        _count: { id: true },
      }),
      prisma.meeting.groupBy({
        by: ['createdById'],
        where: { createdById: { in: agentIds }, ...meetingDateFilter },
        _count: { id: true },
      }),
      prisma.activity.groupBy({
        by: ['userId'],
        where: { userId: { in: agentIds }, ...activityDateFilter },
        _count: { id: true },
      }),
    ]);

    const leadCountMap = new Map(leadCounts.map(l => [l.assignedToId, l._count.id]));
    const wonCountMap = new Map(wonCounts.map(w => [w.assignedToId, w._count.id]));
    const appointmentCountMap = new Map(appointmentCounts.map(a => [a.assignedToId, a._count.id]));
    const callCountMap = new Map(callCounts.map(c => [c.userId, c._count.id]));
    const meetingCountMap = new Map(meetingCounts.map(m => [m.createdById, m._count.id]));
    const activityCountMap = new Map(activityCounts.map(a => [a.userId, a._count.id]));

    const agentStats = agents.map(a => ({
      agent: a,
      totalLeads: leadCountMap.get(a.id) || 0,
      closedWon: wonCountMap.get(a.id) || 0,
      appointmentSet: appointmentCountMap.get(a.id) || 0,
      totalCalls: callCountMap.get(a.id) || 0,
      totalMeetings: meetingCountMap.get(a.id) || 0,
      totalActivities: activityCountMap.get(a.id) || 0,
    }));

    // Team totals
    const totalLeads = agentStats.reduce((sum, a) => sum + a.totalLeads, 0);
    const totalWon = agentStats.reduce((sum, a) => sum + a.closedWon, 0);
    const totalAppointments = agentStats.reduce((sum, a) => sum + a.appointmentSet, 0);
    const totalCalls = agentStats.reduce((sum, a) => sum + a.totalCalls, 0);
    const totalMeetings = agentStats.reduce((sum, a) => sum + a.totalMeetings, 0);
    const totalActivities = agentStats.reduce((sum, a) => sum + a.totalActivities, 0);

    res.json({
      teamStats: {
        totalLeads,
        activeLeads: Math.max(0, totalLeads - totalWon),
        appointmentSet: totalAppointments,
        closedWon: totalWon,
        totalCalls,
        totalMeetings,
        totalActivities,
      },
      agentStats,
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/hr/dashboard error');
  }
});

// ═══ GET /api/hr/leads ═══
router.get('/leads', authenticateToken, checkPermission('hr', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, assignedTo, agent } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);
    const assignedToId = assignedTo || agent;

    const where: Prisma.LeadWhereInput = { isDeleted: false };
    if (status && status !== 'all') where.status = status;
    if (assignedToId && assignedToId !== 'all') where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { company: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: getLeadInclude(true),
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/hr/leads error');
  }
});

// ═══ GET /api/hr/closed-leads ═══
router.get('/closed-leads', authenticateToken, checkPermission('hr', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, assignedTo, agent } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);
    const assignedToId = assignedTo || agent;

    const where: Prisma.LeadWhereInput = { isDeleted: false, status: 'Active Account' };
    if (assignedToId && assignedToId !== 'all') where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { company: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: getLeadInclude(true),
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/hr/closed-leads error');
  }
});

export default router;
