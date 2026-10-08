import { Router, Response } from 'express';
import { CallStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCallSchema, updateCallSchema, updateRecordingSchema } from '../validators/call.js';
import { USER_SELECT } from '../lib/selects.js';
import { parsePagination, buildDateRange } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

const STATUS_MAP: Record<string, CallStatus> = {
  completed: 'Completed',
  complete: 'Completed',
  connected: 'Completed',
  interested: 'Completed',
  missed: 'Missed',
  voicemail: 'Voicemail',
  'left vm': 'Voicemail',
  'left voicemail': 'Voicemail',
  'no answer': 'No_Answer',
  no_answer: 'No_Answer',
  busy: 'Busy',
  'wrong number': 'Failed',
  wrong_number: 'Failed',
  failed: 'Failed',
  scheduled: 'Scheduled',
  'follow-up': 'Scheduled',
  followup: 'Scheduled',
  follow_up: 'Scheduled',
  callback_requested: 'Scheduled',
  'call booked': 'Scheduled',
};

const OUTCOME_MAP: Record<string, string> = {
  connected: 'connected',
  voicemail: 'voicemail',
  'left vm': 'voicemail',
  'left voicemail': 'voicemail',
  'no answer': 'no_answer',
  no_answer: 'no_answer',
  busy: 'busy',
  'wrong number': 'wrong_number',
  wrong_number: 'wrong_number',
  callback_requested: 'callback_requested',
  'call booked': 'callback_requested',
  'call back in a while': 'callback_requested',
  'not interested': 'not_interested',
  not_interested: 'not_interested',
  interested: 'interested',
};

function normalizeCallStatus(rawStatus?: string, rawOutcome?: string) {
  const statusKey = String(rawStatus || '').trim().toLowerCase();
  const outcomeKey = String(rawOutcome || '').trim().toLowerCase();
  return STATUS_MAP[statusKey] || STATUS_MAP[outcomeKey] || 'Completed';
}

function normalizeCallOutcome(rawOutcome?: string, rawNotes?: string) {
  const outcomeKey = String(rawOutcome || '').trim().toLowerCase();
  const notesKey = String(rawNotes || '').trim().toLowerCase();
  return OUTCOME_MAP[outcomeKey] || OUTCOME_MAP[notesKey] || 'connected';
}

function parseDurationSeconds(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const input = value.trim().toLowerCase();
  if (!input) {
    return 0;
  }

  if (input.includes(':')) {
    const parts = input.split(':').map(part => parseInt(part, 10));
    if (parts.every(part => Number.isFinite(part))) {
      if (parts.length === 2) {
        return (parts[0] * 60) + parts[1];
      }
      if (parts.length === 3) {
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
      }
    }
  }

  const matched = input.match(/(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)?/g);
  if (matched && matched.length > 0) {
    let total = 0;
    matched.forEach(token => {
      const piece = token.match(/(\d+)\s*(.*)?/);
      if (!piece) {
        return;
      }

      const amount = parseInt(piece[1], 10);
      const unit = (piece[2] || '').trim();
      if (!Number.isFinite(amount)) {
        return;
      }

      if (!unit || unit.startsWith('m')) {
        total += amount * 60;
      } else if (unit.startsWith('h')) {
        total += amount * 3600;
      } else {
        total += amount;
      }
    });
    return total;
  }

  const parsed = parseInt(input, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function deriveLeadName(lead: { firstName: string; lastName: string; company: string | null }) {
  const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
  return fullName || lead.company || 'Unknown Lead';
}

function deriveTimeLabel(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ═══ GET /api/calls ═══
router.get('/', authenticateToken, checkPermission('calls', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, search, dateFrom, dateTo, status } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.CallWhereInput = {};
    const role = req.user!.role;
    if (role === 'sdr' || role === 'closer') where.userId = req.user!.id;
    if (leadId) where.leadId = leadId;
    if (status) where.status = normalizeCallStatus(status);
    const dateRange = buildDateRange(dateFrom, dateTo);
    if (dateRange) {
      where.createdAt = dateRange;
    }
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' as const } },
        { leadName: { contains: search, mode: 'insensitive' as const } },
        { agentName: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true, phone: true } },
          user: { select: USER_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.call.count({ where }),
    ]);

    res.json({
      calls,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/calls error');
  }
});

// ═══ GET /api/calls/recordings ═══
router.get('/recordings', authenticateToken, checkPermission('calls', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { recordingUrl: { not: null } };
    const role = req.user!.role;
    if (role === 'sdr' || role === 'closer') where.userId = req.user!.id;

    const calls = await prisma.call.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        user: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(calls);
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/calls/recordings error');
  }
});

// ═══ GET /api/calls/:id ═══
router.get('/:id', authenticateToken, checkPermission('calls', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const call = await prisma.call.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true, phone: true } },
        user: { select: USER_SELECT },
      },
    });

    if (!call) return res.status(404).json({ error: 'Call not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && call.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(call);
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/calls/:id error');
  }
});

// ═══ POST /api/calls ═══
router.post('/', authenticateToken, checkPermission('calls', 'create'), validate(createCallSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, leadName, agentName, date, time, duration, outcome, notes, direction, contactNumber, recordingUrl, hasRecording, status } = req.body;

    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const callDate = date ? new Date(date) : new Date();
    const normalizedOutcome = normalizeCallOutcome(outcome, notes);
    const normalizedStatus = normalizeCallStatus(status, normalizedOutcome);

    const call = await prisma.call.create({
      data: {
        leadId, userId: req.user!.id,
        leadName: leadName || deriveLeadName(lead),
        agentName: agentName || req.user!.name,
        date: Number.isNaN(callDate.getTime()) ? new Date() : callDate,
        time: time || deriveTimeLabel(callDate),
        duration: parseDurationSeconds(duration),
        outcome: normalizedOutcome,
        notes: notes || '',
        direction: direction || 'outbound',
        contactNumber: contactNumber || lead.phone || '',
        recordingUrl: recordingUrl || null,
        hasRecording: Boolean(hasRecording || recordingUrl),
        status: normalizedStatus,
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        user: { select: USER_SELECT },
      },
    });

    // Auto-promote to Contacted (also handled by DB trigger)
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastContactedAt: new Date(),
        ...(lead.status === 'New Lead' || lead.status === 'In Progress' ? { status: 'Contacted' } : {}),
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        leadId, userId: req.user!.id, type: 'call',
        description: `${direction || 'outbound'} call (${normalizedOutcome}) - ${parseDurationSeconds(duration)}s`,
      },
    });

    res.status(201).json(call);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/calls error');
  }
});

// ═══ PUT /api/calls/:id ═══
router.put('/:id', authenticateToken, checkPermission('calls', 'edit'), validate(updateCallSchema), async (req: AuthRequest, res: Response) => {
  try {
    const call = await prisma.call.findUnique({ where: { id: (req.params.id as string) } });
    if (!call) return res.status(404).json({ error: 'Call not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && call.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { duration, outcome, notes, direction, contactNumber, recordingUrl, hasRecording, status, time, leadName, agentName, date } = req.body;
    const data: Prisma.CallUncheckedUpdateInput = {};
    if (duration !== undefined) data.duration = parseDurationSeconds(duration);
    if (outcome !== undefined) data.outcome = normalizeCallOutcome(outcome, notes);
    if (notes !== undefined) data.notes = notes;
    if (direction !== undefined) data.direction = direction;
    if (contactNumber !== undefined) data.contactNumber = contactNumber;
    if (recordingUrl !== undefined) data.recordingUrl = recordingUrl;
    if (hasRecording !== undefined) data.hasRecording = Boolean(hasRecording);
    if (status !== undefined) data.status = normalizeCallStatus(status, outcome);
    if (time !== undefined) data.time = time;
    if (leadName !== undefined) data.leadName = leadName;
    if (agentName !== undefined) data.agentName = agentName;
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (!Number.isNaN(parsedDate.getTime())) {
        data.date = parsedDate;
      }
    }

    const updated = await prisma.call.update({
      where: { id: (req.params.id as string) },
      data,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        user: { select: USER_SELECT },
      },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/calls/:id error');
  }
});

// ═══ PUT /api/calls/:id/recording ═══
router.put('/:id/recording', authenticateToken, checkPermission('calls', 'edit'), validate(updateRecordingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const call = await prisma.call.findUnique({ where: { id: (req.params.id as string) } });
    if (!call) return res.status(404).json({ error: 'Call not found' });

    const { recordingUrl } = req.body;
    if (!recordingUrl) return res.status(400).json({ error: 'recordingUrl is required' });

    const updated = await prisma.call.update({
      where: { id: (req.params.id as string) },
      data: { recordingUrl },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/calls/:id/recording error');
  }
});

export default router;
