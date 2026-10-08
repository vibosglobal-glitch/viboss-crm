import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createNoteSchema } from '../validators/note.js';
import { parsePagination } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';
import { USER_PUBLIC_SELECT } from '../lib/selects.js';

const router = Router();

// ═══ GET /api/notes ═══
router.get('/', authenticateToken, checkPermission('notes', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, search } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.NoteWhereInput = { userId: req.user!.id };
    if (leadId) where.leadId = leadId;
    if (search) {
      where.content = { contains: search, mode: 'insensitive' as const };
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          user: { select: USER_PUBLIC_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.note.count({ where }),
    ]);

    res.json({
      notes,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/notes error');
  }
});

// ═══ POST /api/notes ═══
router.post('/', authenticateToken, checkPermission('notes', 'create'), validate(createNoteSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { content, leadId } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const note = await prisma.note.create({
      data: {
        content,
        userId: req.user!.id,
        leadId: leadId || null,
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        user: { select: USER_PUBLIC_SELECT },
      },
    });

    // Log activity if note is tied to a lead
    if (leadId) {
      await prisma.activity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'note',
          description: `Note added by ${req.user!.name}`,
        },
      });
    }

    res.status(201).json(note);
  } catch (err) {
    return sendRouteError(res, err, 'POST /api/notes error');
  }
});

// ═══ PUT /api/notes/:id ═══
router.put('/:id', authenticateToken, checkPermission('notes', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const note = await prisma.note.findUnique({ where: { id: (req.params.id as string) } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId !== req.user!.id) return res.status(403).json({ error: 'Not authorized' });

    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const updated = await prisma.note.update({
      where: { id: (req.params.id as string) },
      data: { content },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        user: { select: USER_PUBLIC_SELECT },
      },
    });

    res.json(updated);
  } catch (err) {
    return sendRouteError(res, err, 'PUT /api/notes/:id error');
  }
});

// ═══ DELETE /api/notes/:id ═══
router.delete('/:id', authenticateToken, checkPermission('notes', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const note = await prisma.note.findUnique({ where: { id: (req.params.id as string) } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.note.delete({ where: { id: (req.params.id as string) } });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    return sendRouteError(res, err, 'DELETE /api/notes/:id error');
  }
});

export default router;
