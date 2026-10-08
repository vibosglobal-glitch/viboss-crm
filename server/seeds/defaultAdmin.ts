/**
 * Seed default admin and staff users for V!BOS.
 * Run: npx tsx server/seeds/defaultAdmin.ts
 */
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';

async function seedAdmin() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL');

        const adminPassword = (env as any).SEED_ADMIN_PASSWORD || 'Vibos@2026';
        const teamPassword = (env as any).SEED_TEAM_PASSWORD || 'Vibos@2026';

        const adminHash = await bcrypt.hash(adminPassword, 12);
        const teamHash = await bcrypt.hash(teamPassword, 12);

        // Remove legacy mock demo users if present
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [
                        'admin@company.com',
                        'chiren@ualliances.com',
                        'rajesh@ualliances.com',
                        'priya@ualliances.com',
                        'amit@ualliances.com',
                        'deepa@ualliances.com',
                        'karan@ualliances.com',
                        'sanjay@ualliances.com',
                    ],
                },
            },
        });

        // Upsert designated admin
        await prisma.user.upsert({
            where: { email: 'suhail@vibosglobal.com' },
            update: {
                name: 'Sohil',
                password: adminHash,
                role: 'admin',
                avatar: 'SO',
                isActive: true,
            },
            create: {
                name: 'Sohil',
                email: 'suhail@vibosglobal.com',
                password: adminHash,
                role: 'admin',
                avatar: 'SO',
                isActive: true,
            },
        });

        // Upsert designated staff
        await prisma.user.upsert({
            where: { email: 'stuart.young@vibosglobal.com' },
            update: {
                name: 'Stuart Young',
                password: teamHash,
                role: 'sdr',
                avatar: 'SY',
                isActive: true,
            },
            create: {
                name: 'Stuart Young',
                email: 'stuart.young@vibosglobal.com',
                password: teamHash,
                role: 'sdr',
                avatar: 'SY',
                isActive: true,
            },
        });

        console.log('[SEED] ✅ Created/verified production users:');
        console.log('  Admin: Sohil (suhail@vibosglobal.com)');
        console.log('  Staff: Stuart Young (stuart.young@vibosglobal.com)');
    } catch (err) {
        console.error('[SEED] ❌ Failed:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected from PostgreSQL.');
    }
}

seedAdmin();
