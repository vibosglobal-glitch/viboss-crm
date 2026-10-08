import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/postgres'),
    JWT_SECRET: z.string().default('default_secure_and_long_jwt_secret_32chars'),
    PORT: z.string().default('3001'),
    APP_URL: z.string().default('http://localhost:3000'),

    // Seed passwords
    SEED_ADMIN_PASSWORD: z.string().optional(),
    SEED_TEAM_PASSWORD: z.string().optional(),

    // Supabase & Groq
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),

    // Email (SMTP) config
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // CORS 
    ALLOWED_ORIGINS: z.string().optional(),
});

// Since Next.js bundles edge, middleware, and server contexts differently, 
// we only parse process.env when not in a browser environment.
const isServer = typeof window === 'undefined';

let env: z.infer<typeof envSchema>;

if (isServer) {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:', parsed.error.format());
        throw new Error('Invalid environment variables');
    }

    env = parsed.data;
} else {
    // In the browser, we don't expose server env vars. 
    // Any NEXT_PUBLIC_ vars would be handled here, but this app mainly uses server vars.
    env = {} as any;
}

export const config = env;
