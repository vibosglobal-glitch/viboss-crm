# Bug And Security Checklist

## Bug-Fix Checklist

1. Confirm the actual failing behavior, not just the symptom reported upstream.
2. Locate the first incorrect boundary: UI state, API contract, validation layer, query, or persistence.
3. Check whether the issue is caused by a type mismatch, nullability gap, stale assumption, or missing guard.
4. Fix the root cause in the narrowest correct layer.
5. Verify all touched consumers, not only the first failing screen or route.

## Security Checklist

1. Validate all changed request input at the boundary.
2. Enforce permissions on the server, even if the UI already hides the action.
3. Avoid returning sensitive fields that the consumer does not need.
4. Sanitize or strictly constrain rich text, HTML, file uploads, and CSV import paths.
5. Prefer least-privilege defaults for admin, HR, leadgen, and SDR role flows.
6. Check whether the change affects audit logging, notifications, or activity tracking.
7. Preserve safe headers, rate limiting, and token or cookie handling where relevant.

## TypeScript And Prisma Standards

1. Use explicit domain types at boundaries and infer from Zod or Prisma where appropriate.
2. Avoid broad casts, especially across API and database layers.
3. Treat nullable database fields as nullable until narrowed.
4. Keep Prisma selects and includes minimal and intentional.
5. When a schema change is required, review query, seed, and serialization impact together.

## Definition Of Done

1. The bug or vulnerability is addressed at the root cause.
2. Changed files build or pass the most relevant validation commands.
3. The implementation matches existing architecture and naming.
4. Residual risk is stated clearly if anything remains unverified.