# Next.js 15 Security Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade to the smallest approved secure Next.js line and clear production high/critical dependency advisories without changing product behavior.

**Architecture:** Pin the framework and ESLint configuration to 15.5.24, use compiler/build failures as migration tests for Next.js 15 asynchronous request APIs, and keep React 18 plus the existing next-intl middleware architecture. Validate security and behavior with the full repository gate.

**Tech Stack:** Next.js 15.5.24, React 18, TypeScript, next-intl 4, Jest, npm audit.

---

### Task 1: Establish the migration red phase

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Install exact `next@15.5.24` and `eslint-config-next@15.5.24` versions.
- [ ] Run `npm run typecheck` and `npm run build` and record failures caused by synchronous request APIs or other Next.js 15 incompatibilities.
- [ ] Run `npm audit --omit=dev --registry=https://registry.npmjs.org --audit-level=high` and verify the target dependency graph has no production high/critical findings.

### Task 2: Migrate request-bound APIs

**Files:**
- Modify: `src/i18n/request.ts`
- Modify: App Router page, layout, and route-handler files identified by the compiler.

- [ ] Change `cookies()` to `await cookies()` in the async next-intl request configuration.
- [ ] Type page, layout, and route-handler `params` as promises and await them at function entry.
- [ ] Re-run `npm run typecheck` after each migration batch until it passes.
- [ ] Run focused tests for each changed route family and preserve their behavior.

### Task 3: Validate framework integrations

**Files:**
- Verify: `src/middleware.ts`
- Verify: `next.config.mjs`
- Verify: `src/i18n/request.ts`
- Verify: `src/i18n/routing.ts`

- [ ] Run middleware, i18n, route-contract, image, and Server Action searches/tests.
- [ ] Confirm `images.unoptimized` remains enabled, no Server Actions exist, and no deprecated edge runtime value is present.
- [ ] Run the focused SEO and route test suites.

### Task 4: Full release gate and local commit

**Files:**
- Modify: `docs/SECURITY_REVIEW_2026-09-15.md`
- Modify: this plan checklist.

- [ ] Run `npm ci`.
- [ ] Run `npm test -- --runInBand --silent`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Run the official-registry production audit and require zero high/critical advisories.
- [ ] Run `git diff --check` and credential-signature scans.
- [ ] Commit locally, verify a clean worktree, and do not push or deploy.

