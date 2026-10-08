import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  lead: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../../lib/prisma.js', () => ({ default: prismaMock }));

import leadsRouter from '../leads.js';
import { env } from '../../config/env.js';
import { LEAD_LIST_SELECT } from '../../lib/selects.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/leads', leadsRouter);
  return app;
}

const token = jwt.sign(
  { id: 'user-1', role: 'admin', email: 'admin@example.com', name: 'Admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' },
);

describe('leads routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/leads', () => {
    it('applies hasFollowUp filter and uses LEAD_LIST_SELECT', async () => {
      prismaMock.lead.findMany.mockResolvedValue([]);
      prismaMock.lead.count.mockResolvedValue(0);

      const app = buildApp();
      const res = await request(app)
        .get('/api/leads?hasFollowUp=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
            nextFollowUp: { not: null },
          }),
          select: LEAD_LIST_SELECT,
          orderBy: { nextFollowUp: 'asc' }, // default ascending due to isFollowUpMode
          skip: 0,
          take: 25, // default limit
        })
      );
    });

    it('uses correct default sort without hasFollowUp', async () => {
      prismaMock.lead.findMany.mockResolvedValue([]);
      prismaMock.lead.count.mockResolvedValue(0);

      const app = buildApp();
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
            where: expect.objectContaining({
                isDeleted: false,
            }),
            select: LEAD_LIST_SELECT,
            orderBy: { createdAt: 'desc' }, // default when not isFollowUpMode
            skip: 0,
            take: 25,
        })
      );
    });

    it('prioritizes explicit sortBy over hasFollowUp default', async () => {
        prismaMock.lead.findMany.mockResolvedValue([]);
        prismaMock.lead.count.mockResolvedValue(0);
  
        const app = buildApp();
        const res = await request(app)
          .get('/api/leads?hasFollowUp=true&sortBy=company&sortOrder=desc')
          .set('Authorization', `Bearer ${token}`);
  
        expect(res.status).toBe(200);
  
        expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
              orderBy: { company: 'desc' },
          })
        );
      });
  });
});
