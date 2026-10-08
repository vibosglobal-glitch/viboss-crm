import 'dotenv/config';
import prisma from '../lib/prisma';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

let hasFailures = false;

function fail(message: string) {
  hasFailures = true;
  console.log(message);
}

async function closeConnections() {
  await prisma.$disconnect().catch(() => undefined);
}

async function diagnose() {
  console.log('\n========== DATABASE DIAGNOSIS ==========\n');

  try {
    await prisma.$connect();
    console.log('✅ TEST 1 PASSED: Connected to PostgreSQL');
  } catch (err) {
    fail('❌ TEST 1 FAILED: Cannot connect to PostgreSQL');
    console.log('   Error:', (err as Error).message);
    console.log('   → Check your DATABASE_URL in .env');
    console.log('   → Make sure PostgreSQL or Prisma dev DB is running');
    await closeConnections();
    process.exit(1);
  }

  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    console.log('✅ TEST 2: Tables found:', tables.map((t) => t.tablename).join(', '));

    if (tables.length === 0) {
      fail('❌ NO TABLES EXIST — you need to run: npx prisma db push');
      await closeConnections();
      process.exit(1);
    }

    const expected = ['users', 'leads', 'calls', 'pipeline_stages', 'notes', 'meetings', 'tasks', 'notifications', 'activities', 'audit_logs'];
    const existing = tables.map((t) => t.tablename);
    const missing = expected.filter((t) => !existing.includes(t));
    if (missing.length > 0) {
      fail(`⚠️  MISSING TABLES: ${missing.join(', ')}`);
      console.log('   → Run: npx prisma db push');
    } else {
      console.log('✅ All expected tables exist');
    }
  } catch (err) {
    fail(`❌ TEST 2 FAILED: ${(err as Error).message}`);
  }

  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'leads' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    console.log('\n✅ TEST 3: Leads table columns:');
    columns.forEach((c) => console.log(`   ${c.column_name} (${c.data_type})`));

    const colNames = columns.map((c) => c.column_name);
    if (!colNames.includes('pipeline_stage_id')) fail('❌ MISSING: pipeline_stage_id column');
    if (!colNames.includes('uploaded_by')) fail('❌ MISSING: uploaded_by column');
    if (!colNames.includes('assigned_to')) fail('❌ MISSING: assigned_to column');
    if (!colNames.includes('first_name')) fail('❌ MISSING: first_name column');
    if (!colNames.includes('is_deleted')) fail('❌ MISSING: is_deleted column');
    if (colNames.includes('_id')) console.log('⚠️  WARNING: _id column exists — this is MongoDB style');
    if (colNames.includes('__v')) console.log('⚠️  WARNING: __v column exists — this is Mongoose version key');
  } catch (err) {
    fail(`❌ TEST 3 FAILED: ${(err as Error).message}`);
  }

  try {
    const userCount = await prisma.user.count();
    console.log(`\n✅ TEST 4: Users in database: ${userCount}`);
    if (userCount === 0) {
      console.log('⚠️  No users — seed data did not run.');
    } else {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, role: true, email: true },
        orderBy: { createdAt: 'asc' },
      });
      users.forEach((u) => console.log(`   ${u.role}: ${u.name} (${u.email}) — ID: ${u.id}`));
    }
  } catch (err) {
    fail(`❌ TEST 4 FAILED: ${(err as Error).message}`);
    console.log('   → Prisma schema may not match the actual database');
    console.log('   → Run: npx prisma generate && npx prisma db push');
  }

  try {
    const stageCount = await prisma.pipelineStage.count();
    console.log(`\n✅ TEST 5: Pipeline stages in database: ${stageCount}`);
    if (stageCount === 0) {
      console.log('⚠️  No pipeline stages — seed data did not run.');
    } else {
      const stages = await prisma.pipelineStage.findMany({ orderBy: { order: 'asc' } });
      stages.forEach((s) => console.log(`   ${s.order}. ${s.name} (${s.id}) default=${s.isDefault}`));
    }
  } catch (err) {
    fail(`❌ TEST 5 FAILED: ${(err as Error).message}`);
  }

  try {
    const leadCount = await prisma.lead.count();
    console.log(`\n✅ TEST 6: Leads in database: ${leadCount}`);
    if (leadCount > 0) {
      const leads = await prisma.lead.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          pipelineStage: true,
          uploader: { select: { name: true } },
        },
      });
      leads.forEach((l) => console.log(`   ${l.firstName} ${l.lastName} — stage: ${l.pipelineStage?.name || 'NULL'} — uploader: ${l.uploader?.name || 'NULL'}`));
    }
  } catch (err) {
    fail(`❌ TEST 6 FAILED: ${(err as Error).message}`);
    console.log('   Full error:', err);
  }

  try {
    const defaultStage = await prisma.pipelineStage.findFirst({ where: { isDefault: true } });
    const firstUser = await prisma.user.findFirst();

    if (!defaultStage) {
      fail('\n❌ TEST 7 SKIPPED: No default pipeline stage — cannot create leads');
    } else if (!firstUser) {
      fail('\n❌ TEST 7 SKIPPED: No users exist — cannot set uploadedBy');
    } else {
      const testLead = await prisma.lead.create({
        data: {
          firstName: '__TEST__',
          lastName: '__DIAGNOSIS__',
          email: 'test-diagnosis@delete.me',
          source: 'manual',
          uploadedById: firstUser.id,
          pipelineStageId: defaultStage.id,
          isDeleted: false,
        },
      });
      console.log(`\n✅ TEST 7 PASSED: Created test lead with ID: ${testLead.id}`);

      const readBack = await prisma.lead.findUnique({ where: { id: testLead.id } });
      if (readBack) {
        console.log('✅ TEST 7b PASSED: Can read it back');
      } else {
        console.log('❌ TEST 7b FAILED: Created but cannot read back');
      }

      await prisma.lead.delete({ where: { id: testLead.id } });
      console.log('✅ TEST 7c: Test lead cleaned up');
    }
  } catch (err) {
    fail('\n❌ TEST 7 FAILED: Cannot create lead');
    console.log('   Error:', (err as Error).message);
    console.log('   Full error:', JSON.stringify(err, null, 2));
    console.log('   → This is likely the SAME error happening when you upload CSV/XLSX');
  }

  console.log('\n✅ TEST 8: DATABASE_URL check');
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const masked = dbUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`   URL: ${masked}`);
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    fail('❌ DATABASE_URL does not start with postgresql:// or postgres://');
  }

  console.log('\n========== DIAGNOSIS COMPLETE ==========\n');
  await closeConnections();
  process.exit(hasFailures ? 1 : 0);
}

diagnose().catch(async (err) => {
  console.error(err);
  await closeConnections();
  process.exit(1);
});