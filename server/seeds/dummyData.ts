import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

async function createLead(pipelineStageId: string, sdrId: string, uploaderId: string, leadData: any) {
    const lead = await prisma.lead.create({
        data: {
            ...leadData,
            pipelineStageId,
            assignedToId: sdrId,
            uploadedById: uploaderId,
        }
    });
    return lead;
}

async function seedDummyData() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL');

        // 1. Ensure basic pipeline stages
        console.log('Ensuring default pipeline stages exist...');
        const stages = [
            { name: 'New Lead', order: 1, color: '#6B7280', probability: 5, isDefault: true },
            { name: 'In Progress', order: 2, color: '#3B82F6', probability: 25 },
            { name: 'Contacted', order: 3, color: '#06B6D4', probability: 45 },
            { name: 'Appointment Set', order: 4, color: '#F59E0B', probability: 70 },
            { name: 'Active Account', order: 5, color: '#10B981', probability: 100 },
        ];
        let defaultStageId: string | null = null;
        for (const st of stages) {
            const stage = await prisma.pipelineStage.upsert({
                where: { name: st.name },
                update: {},
                create: {
                    name: st.name,
                    order: st.order,
                    color: st.color,
                    probability: st.probability,
                    isDefault: st.isDefault || false,
                    isActive: true
                }
            });
            if (st.isDefault) defaultStageId = stage.id;
        }

        if (!defaultStageId) {
            const firstStage = await prisma.pipelineStage.findFirst();
            if (!firstStage) throw new Error('No stages found, this should not happen.');
            defaultStageId = firstStage.id;
        }

        // 2. Grab a few users (SDR, Closer, Admin)
        const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
        const sdrUser = await prisma.user.findFirst({ where: { role: 'sdr' } });
        const closerUser = await prisma.user.findFirst({ where: { role: 'closer' } });

        if (!adminUser || !sdrUser) {
            console.log('❌ Default users not found! Run "npm run seed:admin" first.');
            process.exit(1);
        }

        // 3. Clear existing dummy leads / tasks if we want fresh data, but we'll just append
        console.log('Seeding dummy leads...');

        const dDate = new Date();
        dDate.setDate(dDate.getDate() + 2);

        const lead1 = await createLead(defaultStageId, sdrUser.id, adminUser.id, {
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith@acmecorp.com',
            company: 'Acme Corp',
            jobTitle: 'VP of Sales',
            phone: '555-0100',
            source: 'linkedin',
            status: 'New Lead',
            dealValue: 15000,
            nextFollowUp: dDate
        });

        const lead2 = await createLead(defaultStageId, sdrUser.id, adminUser.id, {
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'sarah.c@cyberdyne.com',
            company: 'Cyberdyne Systems',
            jobTitle: 'Director of Operations',
            phone: '555-0200',
            source: 'website',
            status: 'Contacted',
            dealValue: 50000,
        });

        const lead3 = await createLead(defaultStageId, closerUser ? closerUser.id : sdrUser.id, adminUser.id, {
            firstName: 'Michael',
            lastName: 'Scott',
            email: 'michael@dundermifflin.com',
            company: 'Dunder Mifflin',
            jobTitle: 'Regional Manager',
            phone: '555-0300',
            source: 'referral',
            status: 'Active Account',
            dealValue: 12000,
        });

        console.log('Seeding dummy tasks...');
        await prisma.task.create({
            data: {
                title: 'Follow up with Acme Corp',
                description: 'Send them the latest pricing deck.',
                priority: 'high',
                status: 'pending',
                assignedToId: sdrUser.id,
                createdById: adminUser.id,
                leadId: lead1.id,
                dueDate: dDate,
            }
        });

        await prisma.task.create({
            data: {
                title: 'Prepare demo for Cyberdyne',
                description: 'Prepare AI integration demo.',
                priority: 'urgent',
                status: 'in_progress',
                assignedToId: sdrUser.id,
                createdById: adminUser.id,
                leadId: lead2.id,
            }
        });

        console.log('Seeding dummy calls and activities...');
        // Create a call for Lead1
        await prisma.call.create({
            data: {
                leadId: lead1.id,
                userId: sdrUser.id,
                leadName: 'John Smith',
                agentName: sdrUser.name,
                date: new Date(),
                time: '10:30',
                duration: 120, // 2 minutes
                outcome: 'connected',
                direction: 'outbound',
                status: 'Completed',
                notes: 'Had a quick chat, sent pricing.',
            }
        });

        await prisma.activity.create({
            data: {
                leadId: lead1.id,
                userId: sdrUser.id,
                type: 'call',
                description: 'Completed outbound call to John Smith',
                callDuration: 120,
                callOutcome: 'connected',
            }
        });

        // Create a meeting
        if (closerUser) {
            console.log('Seeding dummy meetings...');
            await prisma.meeting.create({
                data: {
                    title: 'Onboarding Kickoff with Dunder Mifflin',
                    description: 'Initial onboarding',
                    scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
                    time: '14:00',
                    duration: 60,
                    type: 'zoom',
                    leadId: lead3.id,
                    leadName: 'Michael Scott',
                    createdById: closerUser.id,
                    createdByName: closerUser.name,
                    attendees: ['michael@dundermifflin.com', closerUser.email],
                    status: 'scheduled'
                }
            });
        }

        console.log('✅ Dummy data seeded successfully!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected from PostgreSQL.');
    }
}

seedDummyData();
