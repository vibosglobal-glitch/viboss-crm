import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ActivityType, Prisma, UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAgentSchema, updateAgentSchema } from '../validators/agent.js';
import { USER_ADMIN_LIST_SELECT } from '../lib/selects.js';
import { parseBooleanQuery } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

const FOLLOW_UP_TYPES = [ActivityType.follow_up, ActivityType.cadence_touch] as const;

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function countBy<T extends Record<string, string | null>>(rows: Array<T & { _count: { id: number } }>, key: keyof T) {
  return new Map(rows.filter((row) => row[key]).map((row) => [row[key] as string, row._count.id]));
}

function sumBy<T extends Record<string, string | null>>(rows: Array<T & { _sum: { dealValue: number | null } }>, key: keyof T) {
  return new Map(rows.filter((row) => row[key]).map((row) => [row[key] as string, Number(row._sum.dealValue ?? 0)]));
}

// ═══ GET /api/agents ═══
router.get('/', authenticateToken, checkPermission('agents', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, search, isActive } = req.query as Record<string, string>;

    const where: Prisma.UserWhereInput = {};
    if (role) {
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ error: 'Invalid role filter' });
      }
      where.role = role as UserRole;
    }
    const activeFilter = parseBooleanQuery(isActive);
    if (activeFilter !== undefined) where.isActive = activeFilter;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const agents = await prisma.user.findMany({ where, select: USER_ADMIN_LIST_SELECT, orderBy: { name: 'asc' } });

    // Attach stats for each agent
    const agentIds = agents.map(a => a.id);

    if (agentIds.length === 0) {
      return res.json([]);
    }

    const [
      assignedLeadCounts,
      uploadedLeadCounts,
      distributedLeadCounts,
      assignedWonCounts,
      uploadedWonCounts,
      assignedAppointmentCounts,
      uploadedAppointmentCounts,
      assignedRevenueRows,
      uploadedRevenueRows,
      callCounts,
      meetingCounts,
      activityCounts,
      followUpPendingCounts,
      followUpCompletedCounts,
    ] = await Promise.all([
      prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: agentIds }, isDeleted: false },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['uploadedById'],
        where: { uploadedById: { in: agentIds }, isDeleted: false },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['uploadedById'],
        where: { uploadedById: { in: agentIds }, isDeleted: false, assignedToId: { not: null } },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: agentIds }, isDeleted: false, status: 'Active Account' },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['uploadedById'],
        where: { uploadedById: { in: agentIds }, isDeleted: false, status: 'Active Account' },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: agentIds }, isDeleted: false, status: 'Appointment Set' },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['uploadedById'],
        where: { uploadedById: { in: agentIds }, isDeleted: false, status: 'Appointment Set' },
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { in: agentIds }, isDeleted: false, status: 'Active Account' },
        _sum: { dealValue: true },
      }),
      prisma.lead.groupBy({
        by: ['uploadedById'],
        where: { uploadedById: { in: agentIds }, isDeleted: false, status: 'Active Account' },
        _sum: { dealValue: true },
      }),
      prisma.call.groupBy({
        by: ['userId'],
        where: { userId: { in: agentIds } },
        _count: { id: true },
      }),
      prisma.meeting.groupBy({
        by: ['createdById'],
        where: { createdById: { in: agentIds } },
        _count: { id: true },
      }),
      prisma.activity.groupBy({
        by: ['userId'],
        where: { userId: { in: agentIds } },
        _count: { id: true },
      }),
      prisma.activity.groupBy({
        by: ['userId'],
        where: { userId: { in: agentIds }, type: { in: [...FOLLOW_UP_TYPES] }, isCompleted: false },
        _count: { id: true },
      }),
      prisma.activity.groupBy({
        by: ['userId'],
        where: { userId: { in: agentIds }, type: { in: [...FOLLOW_UP_TYPES] }, isCompleted: true },
        _count: { id: true },
      }),
    ]);

    const assignedLeadCountMap = countBy(assignedLeadCounts, 'assignedToId');
    const uploadedLeadCountMap = countBy(uploadedLeadCounts, 'uploadedById');
    const distributedLeadCountMap = countBy(distributedLeadCounts, 'uploadedById');
    const assignedWonCountMap = countBy(assignedWonCounts, 'assignedToId');
    const uploadedWonCountMap = countBy(uploadedWonCounts, 'uploadedById');
    const assignedAppointmentCountMap = countBy(assignedAppointmentCounts, 'assignedToId');
    const uploadedAppointmentCountMap = countBy(uploadedAppointmentCounts, 'uploadedById');
    const assignedRevenueMap = sumBy(assignedRevenueRows, 'assignedToId');
    const uploadedRevenueMap = sumBy(uploadedRevenueRows, 'uploadedById');
    const callCountMap = countBy(callCounts, 'userId');
    const meetingCountMap = countBy(meetingCounts, 'createdById');
    const activityCountMap = countBy(activityCounts, 'userId');
    const followUpPendingCountMap = countBy(followUpPendingCounts, 'userId');
    const followUpCompletedCountMap = countBy(followUpCompletedCounts, 'userId');

    const agentsWithStats = agents.map(agent => {
      const leadsAssigned = assignedLeadCountMap.get(agent.id) || 0;
      const leadsUploaded = uploadedLeadCountMap.get(agent.id) || 0;
      const leadsDistributed = distributedLeadCountMap.get(agent.id) || 0;
      const closedWon = assignedWonCountMap.get(agent.id) || 0;
      const sourcedClosedWon = uploadedWonCountMap.get(agent.id) || 0;
      const appointmentsSet = assignedAppointmentCountMap.get(agent.id) || 0;
      const sourcedAppointmentsSet = uploadedAppointmentCountMap.get(agent.id) || 0;
      const callsMade = callCountMap.get(agent.id) || 0;
      const meetingsBooked = meetingCountMap.get(agent.id) || 0;
      const activities = activityCountMap.get(agent.id) || 0;
      const followUpsPending = followUpPendingCountMap.get(agent.id) || 0;
      const followUpsCompleted = followUpCompletedCountMap.get(agent.id) || 0;
      const revenueClosed = assignedRevenueMap.get(agent.id) || 0;
      const revenueInfluenced = uploadedRevenueMap.get(agent.id) || 0;

      return {
        ...agent,
        avatar: agent.avatar || getInitials(agent.name),
        leadsUploaded,
        leadsDistributed,
        leadsAssigned,
        callsMade,
        meetingsBooked,
        activitiesLogged: activities,
        followUpsCompleted,
        followUpsPending,
        appointmentsSet,
        appointmentsSetSourced: sourcedAppointmentsSet,
        activeAccounts: closedWon,
        activeAccountsSourced: sourcedClosedWon,
        revenueClosed,
        revenueInfluenced,
        stats: {
          totalLeads: leadsAssigned,
          uploadedLeads: leadsUploaded,
          distributedLeads: leadsDistributed,
          closedWon,
          sourcedClosedWon,
          appointmentsSet,
          sourcedAppointmentsSet,
          callsMade,
          meetingsBooked,
          followUpsPending,
          followUpsCompleted,
          activities,
          revenueClosed,
          revenueInfluenced,
        },
      };
    });

    res.json(agentsWithStats);
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/agents error');
  }
});

// ═══ GET /api/agents/:id ═══
router.get('/:id', authenticateToken, checkPermission('agents', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.user.findUnique({ where: { id: (req.params.id as string) }, select: USER_ADMIN_LIST_SELECT });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const [leadCount, wonCount, activityCount, recentActivities] = await Promise.all([
      prisma.lead.count({ where: { assignedToId: agent.id, isDeleted: false } }),
      prisma.lead.count({ where: { assignedToId: agent.id, isDeleted: false, status: 'Active Account' } }),
      prisma.activity.count({ where: { userId: agent.id } }),
      prisma.activity.findMany({
        where: { userId: agent.id },
        include: { lead: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      ...agent,
      stats: { totalLeads: leadCount, closedWon: wonCount, activities: activityCount },
      recentActivities,
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/agents/:id error');
  }
});

// ═══ POST /api/agents ═══
router.post('/', authenticateToken, checkPermission('agents', 'create'), validate(createAgentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    const VALID_ROLES = ['admin', 'manager', 'sdr', 'closer', 'hr', 'lead_gen'];
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing && existing.isActive) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let agent;
    if (existing && !existing.isActive) {
      // Reactivate the previously deactivated user
      agent = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          password: hashedPassword,
          role,
          isActive: true,
          failedLoginAttempts: 0,
          lockUntil: null,
          refreshTokens: { set: [] },
          tokenVersion: { increment: 1 },
        },
        select: USER_ADMIN_LIST_SELECT,
      });
    } else {
      agent = await prisma.user.create({
        data: { name, email: email.toLowerCase(), password: hashedPassword, role },
        select: USER_ADMIN_LIST_SELECT,
      });
    }

    res.status(201).json(agent);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/agents error');
  }
});

// ═══ PUT /api/agents/:id ═══
router.put('/:id', authenticateToken, checkPermission('agents', 'edit'), validate(updateAgentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.user.findUnique({ where: { id: (req.params.id as string) } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const { name, email, role, isActive, password } = req.body;
    const data: Prisma.UserUncheckedUpdateInput = {};
    if (name) data.name = name;
    if (email) data.email = email.toLowerCase();
    if (role && ['admin', 'manager', 'sdr', 'closer', 'hr', 'lead_gen'].includes(role)) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 12);

    const updated = await prisma.user.update({
      where: { id: (req.params.id as string) },
      data,
      select: USER_ADMIN_LIST_SELECT,
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/agents/:id error');
  }
});

// ═══ DELETE /api/agents/:id ═══
router.delete('/:id', authenticateToken, checkPermission('agents', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.user.findUnique({ where: { id: (req.params.id as string) } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (agent.id === req.user!.id) return res.status(400).json({ error: 'Cannot delete yourself' });

    // Soft delete: deactivate + invalidate all sessions
    await prisma.user.update({
      where: { id: (req.params.id as string) },
      data: {
        isActive: false,
        refreshTokens: { set: [] },
        tokenVersion: { increment: 1 },
      },
    });
    res.json({ message: 'Agent deactivated' });
  } catch (err) {
    return sendRouteError(res, err, 'DELETE /api/agents/:id error');
  }
});

export default router;
