# Next.js 15 Security Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade to the smallest approved secure Next.js line and clear production high/critical dependency advisories without changing product behavior.

**Architecture:** Pin the framework and ESLint configuration to 15.5.25, override its compatible PostCSS dependency to the audited 8.5.28 release, use compiler/build failures as migration tests for Next.js 15 asynchronous request APIs, and keep React 18 plus the existing next-intl middleware architecture. Bind pipeline work to `after()`, stop all failure self-chains, recover expired processing leases through Redis-throttled observers, and keep an authenticated daily cron fallback.

**Tech Stack:** Next.js 15.5.25, React 18, TypeScript, next-intl 4, PostCSS 8.5.28, Jest, npm audit.

---

### Task 1: Establish the migration red phase

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] Install exact `next@15.5.25` and `eslint-config-next@15.5.25` versions, with a compatible PostCSS 8.5.28 override.
- [x] Run `npm run typecheck` and `npm run build` and record failures caused by synchronous request APIs or other Next.js 15 incompatibilities.
- [x] Run `npm audit --omit=dev --registry=https://registry.npmjs.org --audit-level=high` and verify the target dependency graph has no production high/critical findings.

### Task 2: Migrate request-bound APIs

**Files:**
- Modify: `src/i18n/request.ts`
- Modify: App Router page, layout, and route-handler files identified by the compiler.

- [x] Change `cookies()` to `await cookies()` in the async next-intl request configuration.
- [x] Type page, layout, and route-handler `params` as promises and await them at function entry.
- [x] Re-run `npm run typecheck` after each migration batch until it passes.
- [x] Run focused tests for each changed route family and preserve their behavior.

### Task 3: Validate framework integrations and worker liveness

**Files:**
- Verify: `src/middleware.ts`
- Verify: `next.config.mjs`
- Verify: `src/i18n/request.ts`
- Verify: `src/i18n/routing.ts`
- Modify: `src/app/api/worker/pipeline/route.ts`
- Modify: `__tests__/unit/pipeline-worker-route.test.ts`
- Modify: `vercel.json`
- Create: `src/lib/worker-wakeup.ts`
- Create: `__tests__/unit/worker-wakeup.test.ts`
- Create: `__tests__/unit/worker-cron-auth.test.ts`

- [x] Run middleware, i18n, route-contract, image, and Server Action searches/tests.
- [x] Confirm `images.unoptimized` remains enabled, no Server Actions exist, and no deprecated edge runtime value is present.
- [x] Register worker execution with `after()` and a 300-second duration, stop lock-conflict self-chains, and bound error recovery across requests.
- [x] Add Redis-throttled status-observer wakeups and a Hobby-compatible authenticated daily cron fallback.
- [x] Make pipeline, cleanup, and quota-reset cron GET authentication fail closed while preserving POST worker-secret authentication.
- [x] Run the focused SEO, route, and worker lifecycle suites.

### Task 4: Full release gate and local commit

**Files:**
- Modify: `docs/SECURITY_REVIEW_2026-09-15.md`
- Modify: this plan checklist.

- [x] Run `npm ci`.
- [x] Run `npm test -- --runInBand --silent`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Run the official-registry production audit and require zero high/critical advisories.
- [x] Run `git diff --check` and credential-signature scans.
- [x] Commit locally, verify a clean worktree, and do not push or deploy.

### Task 5: Correct deferred recovery and stream-first wakeups

**Files:**
- Modify: `src/app/api/worker/pipeline/route.ts`
- Modify: `src/lib/worker-wakeup.ts`
- Modify: `src/app/api/tasks/[taskId]/stream/route.ts`
- Modify: `__tests__/unit/pipeline-worker-route.test.ts`
- Modify: `__tests__/unit/worker-wakeup.test.ts`
- Create: `__tests__/unit/task-stream-wakeup.test.ts`
- Modify: worker lifecycle documentation listed above.

- [x] Replace future-dated recovery payloads with failure-stop semantics that preserve failed settlement leases for observer or cron recovery.
- [x] Add a system sequence test covering no failure self-chain, a pre-expiry empty observer wake, post-expiry observer recovery, and the daily cron fallback.
- [x] Await a timeout-protected, error-isolated throttled wakeup before starting an SSE stream, and prove dispatch precedes its first event.
- [x] Run the full test, type, lint, build, audit, diff, and security gates.
- [x] Commit locally, verify a clean worktree, and do not push or deploy.
