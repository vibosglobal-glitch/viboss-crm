import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ [Prisma] DATABASE_URL is not set in environment! If running on Vercel, please configure DATABASE_URL in Vercel Project Settings > Environment Variables.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
});

const adapter = new PrismaPg(pool);

function buildClient(): PrismaClient {
  const logOpts =
    process.env.NODE_ENV === "development"
      ? (["warn", "error"] as const)
      : (["error"] as const);

  return new PrismaClient({
    adapter,
    log: [...logOpts],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Warm up the connection pool and query engine
export async function warmupPrisma() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Prisma client warmed up");
  } catch (err) {
    console.error("❌ Prisma warmup failed:", err);
    throw err;
  }
}

export default prisma;