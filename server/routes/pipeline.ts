import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createStageSchema, updateStageSchema } from '../validators/pipelineStage.js';
import { USER_PUBLIC_SELECT, STAGE_LIST_SELECT, STAGE_CORE_SELECT } from '../lib/selects.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

const LOCKED_PIPELINE_STAGE_NAMES = ['New Lead', 'In Progress', 'Contacted', 'Appointment Set', 'Active Account'] as const;
const CONTACTED_STAGE_ORDER = LOCKED_PIPELINE_STAGE_NAMES.indexOf('Contacted') + 1;

// ═══ GET /api/pipeline/stages ═══
router.get('/stages', authenticateToken, checkPermission('pipeline', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      where: { isActive: true, name: { in: [...LOCKED_PIPELINE_STAGE_NAMES] } },
      orderBy: { order: 'asc' },
      select: STAGE_LIST_SELECT,
    });

    const role = req.user!.role;
    const leadScope: Prisma.LeadWhereInput = { isDeleted: false };
    if (role === 'sdr' || role === 'closer') {
      leadScope.assignedToId = req.user!.id;
    }

    // Attach lead counts
    const counts = await prisma.lead.groupBy({
      by: ['pipelineStageId'],
      where: leadScope,
      _count: { id: true },
    });
    const countMap = new Map(counts.map(c => [c.pipelineStageId, c._count.id]));

    const stagesWithCounts = stages.map(s => ({
      ...s,
      leadCount: countMap.get(s.id) || 0,
    }));

    res.json(stagesWithCounts);
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/pipeline/stages error');
  }
});

// ═══ GET /api/pipeline/board ═══
router.get('/board', authenticateToken, checkPermission('pipeline', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, assignedTo } = req.query as Record<string, string>;

    const stages = await prisma.pipelineStage.findMany({
      where: { isActive: true, name: { in: [...LOCKED_PIPELINE_STAGE_NAMES] } },
      orderBy: { order: 'asc' },
    });

    const where: Prisma.LeadWhereInput = { isDeleted: false };
    const role = req.user!.role;
    if (role === 'sdr' || role === 'closer') {
      where.assignedToId = req.user!.id;
    }
    if (assignedTo && role !== 'sdr' && role !== 'closer') {
      where.assignedToId = assignedTo;
    }
    if (search) {
      const searchFilter = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
        ],
      };
      if (where.OR) {
        const roleOr = where.OR;
        delete where.OR;
        where.AND = [{ OR: roleOr }, searchFilter];
      } else {
        where.OR = searchFilter.OR;
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: USER_PUBLIC_SELECT },
        pipelineStage: { select: STAGE_CORE_SELECT },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group leads by stage
    const board = stages.map(stage => ({
      stage: { id: stage.id, name: stage.name, color: stage.color, order: stage.order },
      leads: leads.filter(l => l.pipelineStageId === stage.id),
      count: leads.filter(l => l.pipelineStageId === stage.id).length,
    }));

    // Add unassigned stage for leads without a pipeline stage
    const unstagedLeads = leads.filter(l => !l.pipelineStageId);
    if (unstagedLeads.length > 0) {
      board.unshift({
        stage: { id: 'unstaged', name: 'Unassigned Stage', color: '#9ca3af', order: -1 },
        leads: unstagedLeads,
        count: unstagedLeads.length,
      });
    }

    res.json(board);
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/pipeline/board error');
  }
});

// ═══ PATCH /api/pipeline/leads/:id/stage ═══
router.patch('/leads/:id/stage', authenticateToken, checkPermission('leads', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { stageId } = req.body;
    if (!stageId) return res.status(400).json({ error: 'stageId is required' });

    const [lead, stage] = await Promise.all([
      prisma.lead.findUnique({ where: { id: (req.params.id as string) } }),
      prisma.pipelineStage.findUnique({ where: { id: stageId } }),
    ]);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });
    if (!LOCKED_PIPELINE_STAGE_NAMES.includes(stage.name as (typeof LOCKED_PIPELINE_STAGE_NAMES)[number])) {
      return res.status(400).json({ error: 'Only the locked five pipeline stages are supported' });
    }

    const role = req.user!.role;
    if ((role === 'sdr' || role === 'closer') && lead.assignedToId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Map stage to status
    const STAGE_STATUS_MAP: Record<string, string> = {
      'New Lead': 'New Lead',
      'In Progress': 'In Progress',
      'Contacted': 'Contacted',
      'Appointment Set': 'Appointment Set',
      'Active Account': 'Active Account',
    };
    const newStatus = STAGE_STATUS_MAP[stage.name] || lead.status;

    // Status regression check
    const STATUS_ORDER: Record<string, number> = {
      'New Lead': 1, 'In Progress': 2, 'Contacted': 3, 'Appointment Set': 4, 'Active Account': 5,
    };
    const currentOrder = STATUS_ORDER[lead.status] || 0;
    const newOrder = STATUS_ORDER[newStatus] || 0;
    const allowRollbackToContacted = newStatus === 'Contacted' && currentOrder > CONTACTED_STAGE_ORDER;
    if (newOrder < currentOrder && !allowRollbackToContacted) {
      return res.status(400).json({ error: `Cannot move backward from "${lead.status}" to "${newStatus}"` });
    }

    const oldStageId = lead.pipelineStageId;
    const updated = await prisma.lead.update({
      where: { id: (req.params.id as string) },
      data: { pipelineStageId: stageId, status: newStatus },
      include: {
        assignedTo: { select: USER_PUBLIC_SELECT },
        pipelineStage: { select: STAGE_CORE_SELECT },
      },
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id, userId: req.user!.id, type: 'status_change',
        fromStatus: lead.status, toStatus: newStatus,
        description: `Pipeline stage changed to "${stage.name}"`,
        metadata: { oldStageId, newStageId: stageId },
      },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PATCH /api/pipeline/leads/:id/stage error');
  }
});

// ═══ POST /api/pipeline/stages (admin) ═══
router.post('/stages', authenticateToken, checkPermission('pipeline', 'create'), validate(createStageSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, probability } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Get max order
    const maxStage = await prisma.pipelineStage.findFirst({ orderBy: { order: 'desc' } });
    const order = (maxStage?.order || 0) + 1;

    const stage = await prisma.pipelineStage.create({
      data: { name, color: color || '#3b82f6', probability: probability || 0, order, isActive: true },
    });

    res.status(201).json(stage);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/pipeline/stages error');
  }
});

// ═══ PATCH /api/pipeline/stages/reorder (admin) ═══
router.patch('/stages/reorder', authenticateToken, checkPermission('pipeline', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { stages } = req.body;
    if (!Array.isArray(stages)) return res.status(400).json({ error: 'stages array is required' });

    await prisma.$transaction(
      stages.map((s: { id: string; order: number }) =>
        prisma.pipelineStage.update({ where: { id: s.id }, data: { order: s.order } })
      )
    );

    const updated = await prisma.pipelineStage.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PATCH /api/pipeline/stages/reorder error');
  }
});

// ═══ PATCH /api/pipeline/stages/:id (admin) ═══
router.patch('/stages/:id', authenticateToken, checkPermission('pipeline', 'edit'), validate(updateStageSchema), async (req: AuthRequest, res: Response) => {
  try {
    const stage = await prisma.pipelineStage.findUnique({ where: { id: (req.params.id as string) } });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const { name, color, probability, isActive, isDefault } = req.body;
    const data: Prisma.PipelineStageUncheckedUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (probability !== undefined) data.probability = probability;
    if (isActive !== undefined) data.isActive = isActive;
    if (isDefault !== undefined) data.isDefault = isDefault;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.pipelineStage.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const updated = await prisma.pipelineStage.update({ where: { id: (req.params.id as string) }, data });
    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PATCH /api/pipeline/stages/:id error');
  }
});

export default router;
