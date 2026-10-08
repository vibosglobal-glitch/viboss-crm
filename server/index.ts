import http from 'http';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import next from 'next';
import bcrypt from 'bcryptjs';

import prisma from './lib/prisma';
import { warmupPrisma } from './lib/prisma';
import { initIO } from './socket';
import { env } from './config/env';
import { app } from './app';

const isProduction = env.NODE_ENV === 'production';
const PORT = env.PORT || env.INTERNAL_PORT || 3001;
const autoSeedAdminEnabled = isProduction
  ? env.ENABLE_AUTO_SEED_ADMIN === 'true'
  : env.ENABLE_AUTO_SEED_ADMIN !== 'false';
const autoSeedStagesEnabled = isProduction
  ? env.ENABLE_AUTO_SEED_STAGES === 'true'
  : env.ENABLE_AUTO_SEED_STAGES !== 'false';

const httpServer = http.createServer(app);

// ── Attach Socket.IO ──
initIO(httpServer);

// ── Next.js Integration ──
const nextApp = next({ dev: !isProduction });
const nextHandler = nextApp.getRequestHandler();
let nextReady = false;

nextApp.prepare().then(() => {
  nextReady = true;
  console.log('✅ Next.js is fully prepared and ready.');
}).catch((err) => {
  console.error('FATAL Next.js prepare failed:', err);
  process.exit(1);
});

app.use((req: Request, res: Response) => {
  if (!nextReady) {
    res.status(503).send('Server is starting up (building pages). Please refresh in 10 seconds...');
    return;
  }
  return nextHandler(req, res);
});

// Global API error handler
app.use((err: Error & { status?: number; statusCode?: number; code?: string; name?: string; errors?: unknown }, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;

  let status = err.statusCode || err.status || 500;

  if (err.name === 'ZodError') {
    status = 400;
  }

  if (typeof err.code === 'string') {
    if (err.code === 'P2002') status = 409;
    if (err.code === 'P2003') status = 400;
    if (err.code === 'P2025') status = 404;
  }

  if (status < 400 || status > 599) {
    status = 500;
  }

  const isApiRequest = req.originalUrl.startsWith('/api');
  const message = status >= 500
    ? (isProduction ? 'Internal server error' : err.message || 'Internal server error')
    : (err.message || 'Request failed');

  console.error('Unhandled request error:', {
    path: req.originalUrl,
    method: req.method,
    status,
    error: err.message,
    code: err.code,
  });

  if (isApiRequest) {
    return res.status(status).json({
      error: message,
      ...(err.name === 'ZodError' ? { details: err.errors } : {}),
    });
  }

  res.status(status).send(message);
});

// ── Auto-seed ──
const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Lead', order: 1, color: '#6B7280', probability: 5, isDefault: true, description: 'Freshly added lead' },
  { name: 'In Progress', order: 2, color: '#3B82F6', probability: 15, description: 'SDR assigned, working the lead' },
  { name: 'Contacted', order: 3, color: '#06B6D4', probability: 30, description: 'Initial contact made' },
  { name: 'Appointment Set', order: 4, color: '#F59E0B', probability: 60, description: 'Meeting or appointment scheduled' },
  { name: 'Active Account', order: 5, color: '#10B981', probability: 100, description: 'Deal closed — active client' },
];

const LEGACY_PIPELINE_STAGE_MAP: Record<string, (typeof DEFAULT_PIPELINE_STAGES)[number]['name']> = {
  Lead: 'New Lead',
  'Meeting Scheduled': 'Appointment Set',
  'Proposal Sent': 'Appointment Set',
  Won: 'Active Account',
};

async function autoSeedPipelineStages() {
  try {
    const stageCount = await prisma.pipelineStage.count();
    if (stageCount > 0) {
      console.log(`[SEED] ${stageCount} pipeline stages already exist — skipping.`);
      return;
    }
    await prisma.pipelineStage.createMany({ data: DEFAULT_PIPELINE_STAGES });
    console.log(`[SEED] ✅ Created ${DEFAULT_PIPELINE_STAGES.length} default pipeline stages.`);
  } catch (err) {
    console.error('[SEED] ❌ Pipeline stage seed failed:', err);
  }
}

async function normalizePipelineStages() {
  try {
    const canonicalStageNames = DEFAULT_PIPELINE_STAGES.map((stage) => stage.name);
    const canonicalStages = new Map<string, { id: string; name: string }>();

    for (const stage of DEFAULT_PIPELINE_STAGES) {
      const normalizedStage = await prisma.pipelineStage.upsert({
        where: { name: stage.name },
        update: {
          order: stage.order,
          color: stage.color,
          probability: stage.probability,
          description: stage.description,
          isActive: true,
          isDefault: stage.isDefault,
        },
        create: {
          ...stage,
          isActive: true,
        },
        select: { id: true, name: true },
      });

      canonicalStages.set(stage.name, normalizedStage);
    }

    await prisma.pipelineStage.updateMany({
      where: { name: { notIn: canonicalStageNames } },
      data: { isActive: false, isDefault: false },
    });

    await prisma.pipelineStage.updateMany({
      where: { name: { in: canonicalStageNames.filter((name) => name !== 'New Lead') } },
      data: { isDefault: false },
    });

    const legacyStages = await prisma.pipelineStage.findMany({
      where: { name: { in: Object.keys(LEGACY_PIPELINE_STAGE_MAP) } },
      select: { id: true, name: true },
    });

    for (const legacyStage of legacyStages) {
      const targetStageName = LEGACY_PIPELINE_STAGE_MAP[legacyStage.name];
      const targetStage = canonicalStages.get(targetStageName);

      if (!targetStage || targetStage.id === legacyStage.id) {
        continue;
      }

      const movedLeads = await prisma.lead.updateMany({
        where: { pipelineStageId: legacyStage.id },
        data: {
          pipelineStageId: targetStage.id,
          status: targetStage.name,
        },
      });

      if (movedLeads.count > 0) {
        console.log(`[SEED] Migrated ${movedLeads.count} lead(s) from legacy stage "${legacyStage.name}" to "${targetStage.name}".`);
      }
    }
  } catch (err) {
    console.error('[SEED] ❌ Pipeline normalization failed:', err);
  }
}

async function autoSeedAdmin() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log(`[SEED] Database already has ${userCount} user(s), skipping auto-seed.`);
      return;
    }
    console.log('[SEED] No users found — creating default admin user…');

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const teamPassword = process.env.SEED_TEAM_PASSWORD;
    if (!adminPassword || !teamPassword) {
      console.log('[SEED] SEED_ADMIN_PASSWORD or SEED_TEAM_PASSWORD not set — skipping auto-seed.');
      return;
    }

    const hashAdmin = await bcrypt.hash(adminPassword, 12);
    const hashTeam = await bcrypt.hash(teamPassword, 12);

    await prisma.user.createMany({
      data: [
        { name: 'Sohil', email: 'suhail@vibosglobal.com', password: hashAdmin, avatar: 'SO', role: 'admin' },
        { name: 'Stuart Young', email: 'stuart.young@vibosglobal.com', password: hashTeam, avatar: 'SY', role: 'sdr' },
      ],
    });
    console.log('[SEED] ✅ Created V!BOS default users: Sohil (admin) and Stuart Young (staff)');
  } catch (err) {
    console.error('[SEED] ❌ Auto-seed failed:', err);
  }
}

// ── Auto-create trigger for call → status auto-update ──
async function createAutoStatusTrigger() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION auto_update_lead_status_on_call()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE leads
        SET status = 'Contacted', updated_at = NOW()
        WHERE id = NEW.lead_id
          AND status IN ('New Lead', 'In Progress');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_auto_contacted ON calls;

      CREATE TRIGGER trigger_auto_contacted
      AFTER INSERT ON calls
      FOR EACH ROW
      EXECUTE FUNCTION auto_update_lead_status_on_call();
    `);
    console.log('[DB] ✅ Auto-status trigger created/updated.');
  } catch (err) {
    console.error('[DB] ❌ Failed to create auto-status trigger:', err);
  }
}

// ── Startup: DB first, then accept requests ──
async function startServer() {
  try {
    // Step 1: Connect to DB and warm up Prisma FIRST
    console.log('[BOOT] Connecting to PostgreSQL...');
    await warmupPrisma();
    console.log('✅ Connected to PostgreSQL');

    // Step 1b: Check if schema is initialised; push if tables are missing
    try {
      await prisma.$queryRaw`SELECT 1 FROM users LIMIT 1`;
    } catch {
      console.log('[BOOT] Tables missing — pushing Prisma schema...');
      try {
        const { execSync } = await import('child_process');
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        console.log('[BOOT] ✅ Schema pushed successfully.');
      } catch (pushErr) {
        console.error('[BOOT] ❌ prisma db push failed:', pushErr);
      }
    }

    // Step 2: Run seeds only when explicitly enabled for this environment.
    await Promise.all([
      autoSeedAdminEnabled ? autoSeedAdmin() : Promise.resolve(),
      autoSeedStagesEnabled ? autoSeedPipelineStages() : Promise.resolve(),
    ]);

    if (!autoSeedAdminEnabled) {
      console.log('[SEED] Auto admin seeding is disabled.');
    }
    if (!autoSeedStagesEnabled) {
      console.log('[SEED] Auto pipeline stage seeding is disabled.');
    }

    if (autoSeedStagesEnabled) {
      await normalizePipelineStages();
    } else {
      console.log('[SEED] Pipeline normalization is disabled.');
    }
    await createAutoStatusTrigger();

    // Step 3: NOW bind the port — server is fully ready
    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Unified Server (Next.js + Express) running publicly on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

startServer();

export default app;
