---
name: sales-crm-maintainer
description: 'Maintain and fix the Sales CRM codebase. Use for bugs, vulnerabilities, TypeScript errors, Next.js App Router issues, Express API work, Prisma/PostgreSQL changes, refactors, and production-grade code updates with validation.'
argument-hint: 'Describe the bug, feature, route, page, model, or security issue to handle'
user-invocable: true
---

# Sales CRM Maintainer

Use this skill when working on the Sales CRM as a daily engineering workflow. It is optimized for fixing bugs, reducing vulnerabilities, making full-stack changes, and validating work across the actual stack in this repository: Next.js, React, TypeScript, Express, Prisma, and PostgreSQL.

## When to Use

- Fix runtime bugs, broken flows, failed builds, or TypeScript errors
- Investigate security issues, auth problems, missing validation, or unsafe data handling
- Implement or refactor features that touch Next.js frontend, Express routes, Prisma models, or shared TypeScript types
- Review a change for regressions, incomplete validation, or industry-grade implementation quality
- Triage incidents where the root cause may span frontend, backend, database, or environment boundaries

## Operating Rules

- Fix root causes, not just visible symptoms
- Prefer minimal, focused diffs that preserve established architecture and naming
- Use strong TypeScript types; avoid introducing `any`, hidden nullability, or weakly typed data plumbing
- Preserve Next.js App Router and React patterns already used by the repo unless there is a clear defect
- Keep Express route handlers validated, permission-aware, and consistent with middleware boundaries
- Treat Prisma schema, queries, and database changes as production-impacting work; validate assumptions before changing data shape
- Run the smallest useful validation first, then expand only as needed

## Procedure

1. Define the scope.
   - Identify the user-visible failure, affected files, and whether the issue is frontend, backend, database, security, or cross-cutting.
   - Check the nearest feature folder before making architectural assumptions.

2. Gather evidence.
   - Read the relevant code paths, types, validators, and route or page boundaries.
   - Use workspace diagnostics first for TypeScript, lint, and syntax failures.
   - Search for related call sites, imports, API consumers, and Prisma model usage before editing.

3. Reproduce or reason to a concrete failure mode.
   - Prefer a targeted reproduction path, failing command, or diagnostic trace.
   - If exact reproduction is not available, establish the most defensible root-cause hypothesis from the code and existing errors.

4. Design the fix.
   - Choose the smallest change that closes the bug and aligns with the existing architecture.
   - For security work, add validation, authorization, sanitization, or safer defaults at the boundary where bad input first enters.
   - For data issues, verify the Prisma model, query shape, nullable fields, and serialization path together.

5. Implement with stack-aware standards.
   - Keep server and client responsibilities separated.
   - Validate request input close to the API boundary.
   - Keep shared types consistent across route handlers, hooks, and UI consumers.
   - Avoid introducing duplicated business logic when a shared helper or validator already exists.

6. Validate.
   - Run targeted checks based on the touched area using the repository commands in [stack and validation reference](./references/stack-and-validation.md).
   - For auth, role, notification, import, and data mutation flows, validate both the happy path and a failure or permission-denied path.
   - Re-check diagnostics after the edit.

7. Close out.
   - Summarize the root cause, what changed, residual risk, and any follow-up work.
   - Call out when a broader regression pass or migration is still needed.

## Required Quality Checks

- No new obvious type holes, dead code, or duplicated logic
- No unvalidated request payloads on changed API surfaces
- No trust of client-provided role, identity, or derived state without server enforcement
- No Prisma changes without checking downstream query and seed impact
- No frontend state changes that silently break loading, error, or empty states

## References

- [Stack and validation](./references/stack-and-validation.md)
- [Bug and security checklist](./references/bug-and-security-checklist.md)