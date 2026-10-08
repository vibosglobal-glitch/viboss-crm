# Stack And Validation

## Repository Stack Map

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind, shadcn/ui, React Query, Zod
- Backend: Express 5, TypeScript, Socket.IO, middleware-driven auth and validation
- Database: PostgreSQL through Prisma 7
- Testing and quality: Vitest, TypeScript, ESLint

## Important Repository Paths

- Frontend app shell and routing: `src/app/`
- Shared frontend components: `src/components/`
- Feature modules: `src/features/`
- API and frontend service calls: `src/services/api/`
- Express server entry and routes: `server/index.ts`, `server/routes/`
- Server middleware and validation: `server/middleware/`, `server/validators/`
- Prisma schema: `prisma/schema.prisma`
- Seeds and database support scripts: `server/seeds/`, `server/scripts/`

## Validation Commands

Use the smallest command that proves the change first.

- Full TypeScript and app build validation: `npm run build`
- Server bundling validation: `npm run build:server`
- Tests: `npm test`
- Watch tests during iteration: `npm run test:watch`
- Database connectivity and Prisma dev checks: `npm run db:check`
- Database readiness in local flows: `npm run db:wait`

## Change-Based Validation Matrix

### Next.js pages, layouts, and components

- Check TypeScript and app build
- Verify client versus server component boundaries
- Verify loading, empty, and error behavior if the view consumes async data
- Verify role-based rendering if the page is dashboard-scoped

### Hooks, shared frontend services, and API consumers

- Check the impacted call sites and data contracts
- Verify request or response shape alignment with server routes
- Re-test any debounce, socket, or cached query behavior affected by the change

### Express routes, middleware, and validators

- Verify request validation, auth, permissions, and status code behavior
- Check affected route consumers in the frontend
- Bundle the server and inspect changed imports for ESM compatibility

### Prisma models and data access

- Review the schema and every changed query together
- Confirm nullable, default, unique, and relational assumptions
- Check seed scripts or fixtures if shared data shape changes
- Run database health checks when the change touches persistence behavior

### Security-sensitive changes

- Validate auth and authorization behavior from the server side
- Check input validation and output sanitization
- Confirm secrets remain in environment configuration and are never hard-coded
- Review rate limiting, cookie, token, and session implications where relevant