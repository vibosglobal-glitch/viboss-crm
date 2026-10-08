import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const maxAttempts = 20;
const delayMs = 2000;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function canQueryDatabase() {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function waitForDatabase() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (await canQueryDatabase()) {
        console.log(`Database is ready after ${attempt} attempt${attempt === 1 ? '' : 's'}`);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Waiting for database (${attempt}/${maxAttempts}): ${message}`);
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  console.error(`Database did not become ready after ${maxAttempts} attempts`);
  process.exit(1);
}

waitForDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});