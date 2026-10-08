import { Router, Response } from 'express';
import { MeetingStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createMeetingSchema, updateMeetingSchema } from '../validators/meeting.js';
import { USER_PUBLIC_SELECT } from '../lib/selects.js';
import { parsePagination, buildDateRange } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

function getScheduledAt(input: { scheduledAt?: string; date?: string; time?: string }) {
  if (input.scheduledAt) {
    return new Date(input.scheduledAt);
  }

  if (input.date) {
    const timeValue = (input.time || '09:00').slice(0, 5);
    return new Date(`${input.date}T${timeValue}`);
  }

  return null;
}

function deriveLeadName(lead?: { firstName: string; lastName: string; company: string | null } | null) {
  if (!lead) {
    return undefined;
  }

  const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
  return fullName || lead.company || undefined;
}

// ═══ GET /api/meetings ═══
router.get('/', authenticateToken, checkPermission('meetings', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, dateFrom, dateTo, status } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.MeetingWhereInput = {};
    const role = req.user!.role;
    if (role === 'closer') where.createdById = req.user!.id;
    if (leadId) where.leadId = leadId;
    if (status) {
      if (!Object.values(MeetingStatus).includes(status as MeetingStatus)) {
        return res.status(400).json({ error: 'Invalid meeting status filter' });
      }
      where.status = status as MeetingStatus;
    }
    const dateRange = buildDateRange(dateFrom, dateTo);
    if (dateRange) {
      where.scheduledAt = dateRange;
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          createdBy: { select: USER_PUBLIC_SELECT },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.meeting.count({ where }),
    ]);

    res.json({
      meetings,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/meetings error');
  }
});

// ═══ POST /api/meetings ═══
router.post('/', authenticateToken, checkPermission('meetings', 'create'), validate(createMeetingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, leadName, title, description, scheduledAt, date, time, duration, location, type, attendees, agenda, confirmationSent, nextStep, outcome, ams, driveLink, notes, status } = req.body;
    const scheduledDate = getScheduledAt({ scheduledAt, date, time });
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) return res.status(400).json({ error: 'scheduledAt is required' });

    let linkedLead: { firstName: string; lastName: string; company: string | null } | null = null;

    const data: Prisma.MeetingUncheckedCreateInput = {
      createdById: req.user!.id,
      createdByName: req.user!.name,
      title: title || 'Meeting',
      description: description || '',
      scheduledAt: scheduledDate,
      time: time || scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: duration ? parseInt(duration, 10) : 30,
      location: location || '',
      type: type || 'call',
      status: status || 'scheduled',
      attendees: attendees || [],
      agenda: agenda || '',
      confirmationSent: Boolean(confirmationSent),
      nextStep: nextStep || '',
      outcome: outcome || '',
      ams: ams || '',
      driveLink: driveLink || '',
      notes: notes || '',
    };

    if (leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      data.leadId = leadId;
      linkedLead = lead;
    }

    data.leadName = leadName || deriveLeadName(linkedLead);

    const meeting = await prisma.meeting.create({
      data,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        createdBy: { select: USER_PUBLIC_SELECT },
      },
    });

    // Log activity
    if (leadId) {
      await prisma.activity.create({
        data: {
          leadId, userId: req.user!.id, type: 'meeting',
          description: `Meeting "${title || 'Meeting'}" scheduled for ${scheduledDate.toLocaleDateString()}`,
        },
      });

      // Auto-promote to Appointment Set if Contacted
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead && lead.status === 'Contacted') {
        await prisma.lead.update({ where: { id: leadId }, data: { status: 'Appointment Set' } });
      }
    }

    // Notify admins and SDRs about the new meeting
    const targetUsers = await prisma.user.findMany({
      where: { role: { in: ['admin', 'manager', 'sdr'] }, isActive: true },
      select: { id: true }
    });

    const notificationPayload = targetUsers
      .filter(u => u.id !== req.user!.id)
      .map(u => ({
        userId: u.id,
        title: 'New Meeting Scheduled',
        message: `${req.user!.name} scheduled: "${data.title}" on ${scheduledDate.toLocaleDateString()}`,
        type: 'meeting_scheduled' as any,
        link: '/meetings',
        relatedLeadId: data.leadId || undefined
      }));

    if (notificationPayload.length > 0) {
      await prisma.notification.createMany({ data: notificationPayload });
    }

    res.status(201).json(meeting);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/meetings error');
  }
});

// ═══ PUT /api/meetings/:id ═══
router.put('/:id', authenticateToken, checkPermission('meetings', 'edit'), validate(updateMeetingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const meeting = await prisma.meeting.findUnique({ where: { id: (req.params.id as string) } });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && meeting.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, scheduledAt, date, time, duration, location, type, status, attendees, notes, leadId, leadName, agenda, confirmationSent, nextStep, outcome, ams, driveLink } = req.body;
    const data: Prisma.MeetingUncheckedUpdateInput = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (scheduledAt !== undefined || date !== undefined || time !== undefined) {
      const parsedScheduledAt = getScheduledAt({ scheduledAt, date, time: typeof time === 'string' ? time : meeting.time || undefined });
      if (parsedScheduledAt && !Number.isNaN(parsedScheduledAt.getTime())) {
        data.scheduledAt = parsedScheduledAt;
      }
    }
    if (time !== undefined) data.time = time;
    if (duration !== undefined) data.duration = parseInt(duration, 10);
    if (location !== undefined) data.location = location;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (attendees !== undefined) data.attendees = attendees;
    if (notes !== undefined) data.notes = notes;
    if (leadId !== undefined) data.leadId = leadId || null;
    if (leadName !== undefined) data.leadName = leadName || null;
    if (agenda !== undefined) data.agenda = agenda;
    if (confirmationSent !== undefined) data.confirmationSent = Boolean(confirmationSent);
    if (nextStep !== undefined) data.nextStep = nextStep;
    if (outcome !== undefined) data.outcome = outcome;
    if (ams !== undefined) data.ams = ams;
    if (driveLink !== undefined) data.driveLink = driveLink;

    const updated = await prisma.meeting.update({
      where: { id: (req.params.id as string) },
      data,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        createdBy: { select: USER_PUBLIC_SELECT },
      },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/meetings/:id error');
  }
});

// ═══ DELETE /api/meetings/:id ═══
router.delete('/:id', authenticateToken, checkPermission('meetings', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const meeting = await prisma.meeting.findUnique({ where: { id: (req.params.id as string) } });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && meeting.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.meeting.delete({ where: { id: (req.params.id as string) } });
    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    return sendRouteError(res, err, 'DELETE /api/meetings/:id error');
  }
});

export default router;
