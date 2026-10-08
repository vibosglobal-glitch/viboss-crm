/**
 * Seed default pipeline stages.
 * Run: npx tsx server/seeds/pipelineStages.ts
 */
import prisma from '../lib/prisma';

const DEFAULT_STAGES = [
    { name: 'New Lead', order: 1, color: '#6B7280', probability: 5, isDefault: true, description: 'Freshly added lead' },
    { name: 'In Progress', order: 2, color: '#3B82F6', probability: 15, description: 'SDR assigned — working the lead' },
    { name: 'Contacted', order: 3, color: '#06B6D4', probability: 30, description: 'Initial contact made' },
    { name: 'Appointment Set', order: 4, color: '#F59E0B', probability: 60, description: 'Meeting scheduled with prospect' },
    { name: 'Active Account', order: 5, color: '#10B981', probability: 100, description: 'Lead converted to active account' },
];

const LEGACY_STAGE_MAP: Record<string, (typeof DEFAULT_STAGES)[number]['name']> = {
    Lead: 'New Lead',
    'Meeting Scheduled': 'Appointment Set',
    'Proposal Sent': 'Appointment Set',
    Won: 'Active Account',
};

async function seedStages() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL');

        const canonicalNames = DEFAULT_STAGES.map((stage) => stage.name);
        const canonicalStages = new Map<string, { id: string; name: string }>();

        for (const stage of DEFAULT_STAGES) {
            const normalized = await prisma.pipelineStage.upsert({
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

            canonicalStages.set(stage.name, normalized);
        }

        await prisma.pipelineStage.updateMany({
            where: { name: { notIn: canonicalNames } },
            data: { isActive: false, isDefault: false },
        });

        await prisma.pipelineStage.updateMany({
            where: { name: { in: canonicalNames.filter((name) => name !== 'New Lead') } },
            data: { isDefault: false },
        });

        const legacyStages = await prisma.pipelineStage.findMany({
            where: { name: { in: Object.keys(LEGACY_STAGE_MAP) } },
            select: { id: true, name: true },
        });

        for (const legacyStage of legacyStages) {
            const targetName = LEGACY_STAGE_MAP[legacyStage.name];
            const targetStage = canonicalStages.get(targetName);

            if (!targetStage || targetStage.id === legacyStage.id) {
                continue;
            }

            const moved = await prisma.lead.updateMany({
                where: { pipelineStageId: legacyStage.id },
                data: {
                    pipelineStageId: targetStage.id,
                    status: targetStage.name,
                },
            });

            if (moved.count > 0) {
                console.log(`[SEED] Migrated ${moved.count} lead(s) from "${legacyStage.name}" to "${targetStage.name}".`);
            }
        }

        console.log(`[SEED] ✅ Canonical pipeline stages normalized (${DEFAULT_STAGES.length} locked stages).`);
    } catch (err) {
        console.error('[SEED] ❌ Failed:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected from PostgreSQL.');
    }
}

seedStages();
