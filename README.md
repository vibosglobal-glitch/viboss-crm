# V!BOS — Sales CRM

A modern full-stack sales CRM for Vibos Global built with Next.js, Express, Prisma, PostgreSQL (Supabase), and deployed via **Vercel**.

## Brand Identity & Colors
- **Brand Purple**: `#9667E0` (Primary CTAs, Brand Accent)
- **Base Background**: `#FBFAFF` (Clean off-white)
- **Lavender Accents**: `#F2EBFB`, `#EBD9FC`, and `#D4BBFC` (Sections, borders, cards)
- **Text**: Deep Black (`#0A0910`)

## Production Accounts
- **Admin**: `suhail@vibosglobal.com` | `Vibos@2026`
- **Staff (SDR)**: `stuart.young@vibosglobal.com` | `Vibos@2026`

## Deployment: Vercel & Supabase
1. **Database**: Supabase PostgreSQL (`https://zxbwqkwpuqpbahzealaq.supabase.co`)
   - `DATABASE_URL=postgresql://postgres:Vibossglobal%402027@db.zxbwqkwpuqpbahzealaq.supabase.co:5432/postgres`
   *(Note: The `@` symbol in `vibosglobal@2026` must be URL-encoded as `%40` in the PostgreSQL connection string).*
2. **Platform**: Vercel (Next.js serverless architecture with unified `/api/[...route]` handler)
3. **Repository**: `https://github.com/vibosglobal-glitch/viboss-crm.git`

This CRM is optimized for role-based sales workflows: Admin, Manager, SDR, Closer, Lead Gen, and HR. It includes lead lifecycle management, pipeline stages, calls, meetings, outreach tracking, tasks, notes, notifications, and audit logging.

The repository is designed for single-service deployment to simplify operations and reduce cross-service coordination.

## Core Features

- Role-based dashboards and route-level access
- Lead management with filtering, sorting, pagination, and bulk actions
- CSV/Excel import with preview and mapping
- Canonical five-stage pipeline with analytics support
- Calls, meetings, tasks, notes, and activity tracking
- Notification and realtime updates with Socket.IO
- JWT auth with httpOnly cookies and refresh-token rotation
- Server-side RBAC enforcement and validation with Zod

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Radix UI, React Query
- Backend: Express, TypeScript, Socket.IO, Zod
- Data: PostgreSQL with Prisma ORM
- Tooling: ESLint, Vitest, esbuild, Docker, GitHub Actions

## Project Structure

```text
sales-crm/
  prisma/
    schema.prisma
  server/
    config/          # env + permissions
    middleware/      # auth, validation, audit
    routes/          # API route modules
    services/        # email and service integrations
    validators/      # Zod request schemas
    scripts/         # db utilities
    index.ts         # unified server entry
    socket.ts        # realtime server setup
  src/
    app/             # Next.js App Router pages/layout
    components/      # reusable UI and shared components
    features/        # domain feature modules
    hooks/           # custom hooks
    services/        # frontend API clients
  .github/workflows/
    ci-cd.yml        # CI/CD pipeline
  Dockerfile
  README.md
```

## Architecture and Runtime Model

The app runs as a unified Node process:

1. Express serves API routes under /api
2. Next.js serves app routes and static assets
3. Socket.IO runs on the same HTTP server for realtime events
4. Prisma handles database access

Why this model:

- simpler deployment and scaling path
- single origin for browser app + API + websocket
- fewer networking and auth integration pitfalls

## Environment Variables

Copy .env.example to .env and configure values.

Required:

- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: signing secret (minimum 32 characters)

Strongly recommended:

- JWT_REFRESH_SECRET: dedicated refresh secret
- APP_URL: canonical app URL
- ALLOWED_ORIGINS: comma-separated allowed origins
- COOKIE_SAMESITE: lax, strict, or none
- COOKIE_DOMAIN: cookie domain for production custom domain setups
- SEED_ADMIN_PASSWORD: used by seed:admin
- SEED_TEAM_PASSWORD: used by team seed flows
- ENABLE_AUTO_SEED_ADMIN: auto-create default users on startup (default false)
- ENABLE_AUTO_SEED_STAGES: auto-create default pipeline stages on startup (default false)
- EXIT_ON_UNCAUGHT_EXCEPTION: when true, process exits on uncaught exceptions (default false)

Production note:

- startup auto-seeding and pipeline normalization are disabled by default
- set ENABLE_AUTO_SEED_ADMIN=true or ENABLE_AUTO_SEED_STAGES=true only when intentionally bootstrapping a new environment

Optional (email):

- RESEND_API_KEY
- SMTP_FROM

## Bootstrap Modes

Use one of these startup modes depending on your environment.

1. Minimal bootstrap (recommended)
- Seed only users and pipeline stages.
- Add your real data manually or through CSV import.

2. Optional demo bootstrap
- Seed users + stages, then run dummy data seed.
- Useful for demos and UI walkthroughs.

3. Zero-seed startup
- App can boot, but core flows are limited until users and stages exist.
- You may see login and pipeline limitations until bootstrap data is created.

## Local Development

This is the full local setup from a clean checkout.

1. Install dependencies

npm ci

2. Configure env

- copy .env.example to .env
- set DATABASE_URL and JWT secrets
- set seed passwords (required for seed:admin):
  - SEED_ADMIN_PASSWORD
  - SEED_TEAM_PASSWORD

3. Prepare database schema

- preferred for existing database:
  - npx prisma migrate deploy
- if you are iterating locally and need diagnostics:
  - npm run db:check

4. Bootstrap minimum required app data (no dummy data)

npm run seed:stages
npm run seed:admin

5. Start development server

npm run dev

6. Open the app

- URL: http://localhost:3001

7. Sign in with seeded admin account

- Email: admin@company.com
- Password: value of SEED_ADMIN_PASSWORD

8. Add your own data

- Create users from Admin views
- Add leads manually or via import
- Use pipeline, calls, meetings, tasks, and outreach with real records

## Database and Seeding

Prisma schema: prisma/schema.prisma

Migration and diagnostics:

- npx prisma migrate deploy
- npm run db:check
- npm run db:wait

Core seeds (recommended for real environments):

npm run seed:stages
npm run seed:admin

Optional helpers:

- npm run seed
- npm run seed:all

Optional demo data seed:

- npx tsx server/seeds/dummyData.ts

Seed behavior notes:

- seed:stages normalizes canonical pipeline stages
- seed:admin creates initial users if missing
- dummyData depends on existing seeded users and stages
- you can run the app without dummy data and still use all features

## First Login and Data Entry

After running the minimum seeds:

1. Login as admin
- Email: admin@company.com
- Password: SEED_ADMIN_PASSWORD

2. Create any additional users you need
- Roles: admin, manager, sdr, closer, lead_gen, hr

3. Start with real lead data
- Manual lead creation
- CSV import preview + mapping
- Optional status value mapping for legacy statuses

4. Confirm pipeline works
- Verify five locked stages exist
- Move leads across stages

5. Skip dummy data in production-like environments
- Keep database clean and representative of real operations

Default local runtime URL: http://localhost:3001

## Scripts

- npm run dev: watch-mode unified server
- npm run build: Next.js production build
- npm run build:server: bundle server/index.ts to dist/server.mjs
- npm run start: start bundled production server
- npm run lint: TypeScript typecheck (no emit)
- npm run test: run Vitest once
- npm run test:watch: run Vitest in watch mode
- npm run db:start: Prisma dev DB flow + wait helper
- npm run db:wait: wait for DB availability
- npm run db:check: DB diagnostics
- npm run seed, seed:stages, seed:admin, seed:all

## Testing and Quality Gates

Current baseline:

- unit tests in src/test and server/validators/__tests__
- production frontend build validation
- server bundle validation

Quality gates (local and CI):

1. npm run lint
2. npm run test
3. npm run build
4. npm run build:server

## CI/CD with GitHub Actions

Workflow file: .github/workflows/ci-cd.yml

Pipeline jobs:

1. quality
  - pins Node version to 20.19.0 (matches Dockerfile)
  - launches a Postgres 16 service container for tests (DATABASE_URL is pre-set)
  - checks DB readiness before running tests
  - install dependencies
  - lint
  - run tests
  - build frontend
  - build server bundle

2. docker
  - build Docker image on all PRs and pushes
  - publish image to GHCR on push to main

3. deploy
  - optionally trigger a Coolify deploy webhook on push to main if COOLIFY_WEBHOOK_URL secret exists

Required repository secrets for full CD:

- COOLIFY_WEBHOOK_URL (optional, only if webhook deploy is desired)

No extra secret is needed for GHCR publish using GITHUB_TOKEN when workflow has packages:write permission.

## Docker and Production Deployment

Dockerfile is multi-stage and production-focused:

- deterministic Node base version
- dependency/build layer separation
- Prisma client generation in build and runtime dependency stages
- non-root runtime user
- health check against /api/health
- startup command applies migrations before server boot

Build and run locally:

docker build -t sales-crm:local .
docker run --rm -p 3001:3001 --env-file .env sales-crm:local

Container runtime expectations:

- app listens on port 3001
- DATABASE_URL must be set and reachable
- migration execution requires DB credentials with migration permissions

## Deployment Notes (Coolify, Railway, Generic Docker)

Common production env:

- NODE_ENV=production
- DATABASE_URL=...
- JWT_SECRET=...
- JWT_REFRESH_SECRET=...
- APP_URL=https://your-domain
- ALLOWED_ORIGINS=https://your-domain
- COOKIE_SAMESITE=lax or none depending on topology
- COOKIE_DOMAIN=.your-domain (if needed)
- ENABLE_AUTO_SEED_ADMIN=false
- ENABLE_AUTO_SEED_STAGES=false

Operational checks after deploy:

1. open /api/health
2. verify login flow
3. verify refresh cookie behavior
4. verify Socket.IO connected events

## Security Model

Implemented controls include:

- httpOnly cookie sessions
- refresh-token rotation and reuse checks
- role/permission middleware on sensitive routes
- request validation via Zod
- rate limiting for API and auth-sensitive endpoints
- request sanitization middleware
- audit logging for mutation-oriented flows

Recent hardening updates:

- password reset/change now invalidates active sessions
- impersonation exit flow requires authenticated impersonation context
- production socket auth no longer accepts handshake token fallback
- CSV import assignment now respects role boundaries

## Troubleshooting

1. Build fails due environment validation
- ensure required env vars exist (especially DATABASE_URL and JWT_SECRET)

2. Login works but refresh fails
- verify JWT_REFRESH_SECRET consistency across deployments
- verify cookie domain/samesite/secure settings for your domain

3. CORS blocked requests
- verify ALLOWED_ORIGINS exact origin values
- remove trailing slashes in configured origins

4. Prisma migration errors in container startup
- ensure DB user has migration privileges
- ensure DATABASE_URL points to the correct environment

5. Realtime events not received
- verify same-origin or allowed origin websocket path /socket.io
- verify user is authenticated and room assignment conditions are met

## License

MIT. See LICENSE.
