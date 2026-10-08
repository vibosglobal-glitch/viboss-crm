import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ override: false });

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ENABLE_AUTO_SEED_ADMIN: z.enum(['true', 'false']).optional().default('false'),
    ENABLE_AUTO_SEED_STAGES: z.enum(['true', 'false']).optional().default('false'),
    EXIT_ON_UNCAUGHT_EXCEPTION: z.enum(['true', 'false']).optional().default('false'),
    PORT: z.string().optional(),
    INTERNAL_PORT: z.string().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required for PostgreSQL connection"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(8, "SEED_ADMIN_PASSWORD must be at least 8 characters").optional(),
    SEED_TEAM_PASSWORD: z.string().min(8, "SEED_TEAM_PASSWORD must be at least 8 characters").optional(),
    RESEND_API_KEY: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    APP_URL: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional().default(''),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("❌ Invalid environment variables:");
    console.error(_env.error.format());
    process.exit(1);
}

export const env = _env.data;
