/**
 * Clean all demo and dummy data from database.
 * Preserves default pipeline stages and the 2 configured users.
 * Run: npx tsx server/seeds/cleanDb.ts
 */
import prisma from '../lib/prisma.js';

async function cleanDatabase() {
    try {
        await prisma.$connect();
        console.log('🧹 Cleaning database demo/random data...');

        // Delete test activities, calls, meetings, notes, tasks, outreach, notifications
        await prisma.activity.deleteMany({});
        await prisma.call.deleteMany({});
        await prisma.meeting.deleteMany({});
        await prisma.note.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.outreach.deleteMany({});
        await prisma.notification.deleteMany({});
        await prisma.auditLog.deleteMany({});

        // Delete all leads (fresh start)
        const deletedLeads = await prisma.lead.deleteMany({});
        console.log(`✅ Cleared ${deletedLeads.count} leads.`);

        // Delete any users other than the 2 designated accounts
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                email: {
                    notIn: ['suhail@vibosglobal.com', 'stuart.young@vibosglobal.com'],
                },
            },
        });
        console.log(`✅ Cleared ${deletedUsers.count} unassigned/dummy users.`);

        console.log('✨ Database is now polished and clean.');
    } catch (err) {
        console.error('❌ Failed to clean database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
