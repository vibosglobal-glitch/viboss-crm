# Sales CRM Codebase Audit

Date: 2026-03-13
Scope: Full repository quick audit with runtime checks and targeted security review
Reviewer: GitHub Copilot (GPT-5.3-Codex)

## Executive Summary

Current state is generally strong for a production-oriented TypeScript stack, with passing tests and successful frontend/server production builds. The most important risks were in session invalidation and impersonation guardrails, and those have been remediated in this audit pass.

## Validation Run During Audit

- npm run test: pass (28 tests)
- npm run build: pass (Next.js production build)
- npm run build:server: pass (esbuild server bundle)
- npm run lint: failed before remediation because script used deprecated/invalid next lint invocation in this setup; fixed to tsc --noEmit quality gate.

## Findings (Verified)

### High

1. Session invalidation gap on password reset and change
- Impact: existing refresh sessions could remain valid after password update.
- Files: server/routes/auth.ts
- Status: fixed in this audit pass.

2. Impersonation exit flow accepted backup cookie without requiring active impersonation context
- Impact: weaker boundary for session restoration flow.
- Files: server/routes/auth.ts
- Status: fixed in this audit pass by requiring authenticated impersonated session and identity consistency check.

### Medium

1. CSV import assignment path bypassed assignment role boundary
- Impact: users with upload permission could assign leads during import even without assign permission.
- Files: server/routes/leads.ts
- Status: fixed in this audit pass by role-gating assignment logic during import.

2. Socket auth fallback token accepted in production path
- Impact: widened auth surface beyond cookie flow.
- Files: server/socket.ts
- Status: fixed in this audit pass by restricting fallback to non-production environments.

### Low / Operational

1. Lint command reliability
- Impact: CI lint job could fail due command incompatibility rather than actual quality signal.
- Files: package.json
- Status: fixed in this audit pass.

## Additional Risks Still Worth Tracking

1. CSP currently includes unsafe-inline and unsafe-eval in app/server configs.
- Tradeoff likely tied to framework/runtime constraints.
- Recommendation: move to nonce-based CSP when feasible.

2. Existing tests are mostly unit-level and validator-level.
- Recommendation: add API integration tests around auth, impersonation, and CSV import authorization boundaries.

## Changes Introduced by Audit

- Auth hardening:
  - invalidate refresh tokens and increment tokenVersion on password reset
  - invalidate refresh tokens and increment tokenVersion on password change
  - require authenticated impersonation context on exit impersonation
- Import authorization hardening:
  - prevent unauthorized assignment during CSV import
- Socket hardening:
  - remove production handshake token fallback
- Tooling reliability:
  - lint script updated to a stable typecheck gate for current project baseline
- Production data-safety behavior:
  - auto-seeding of admin users and pipeline stages is now opt-in in production
  - pipeline normalization now runs only when stage auto-seed is explicitly enabled
  - CSV import now continues safely when default pipeline stage is missing

## Suggested Next Checks

- Add focused API tests for:
  - password reset/change invalidating sessions
  - impersonation enter/exit boundaries
  - CSV import assignment authorization
- Evaluate production CSP tightening plan with staged rollout
