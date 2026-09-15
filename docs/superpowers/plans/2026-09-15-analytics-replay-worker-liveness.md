# Analytics Replay and Worker Liveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee delayed GA lifecycle delivery and prove Redis queue recovery while keeping the worker live across every exception exit.

**Architecture:** Add a bounded in-memory pending-event queue behind `trackTaskEventOnce`, execute the existing Redis scripts in a Lua VM fixture, and refactor the worker route around unconditional cleanup and wake-up. Preserve existing public APIs and task semantics.

**Tech Stack:** Next.js 14, React 18, TypeScript, Jest/jsdom, Redis Lua, Wasmoon.

---

### Task 1: Delayed GA lifecycle replay

**Files:**
- Modify: `__tests__/unit/analytics.test.ts`
- Modify: `__tests__/unit/result-page.test.tsx`
- Modify: `src/lib/analytics.ts`

- [ ] Add a failing unit test that queues duplicate task events before `gtag`, dispatches `opla-ga-ready`, and expects one sanitized delivery.
- [ ] Add a failing ResultPage test using the real analytics module and a completed REST response; expect `generation_completed` and `result_view` once after GA readiness.
- [ ] Run the two test files and confirm failures show that no replay occurs.
- [ ] Implement a 100-entry pending `Map`, a single readiness listener, successful-delivery markers, and queue cleanup.
- [ ] Re-run the two test files and confirm they pass.

### Task 2: Executable Redis Lua state machine

**Files:**
- Create: `__tests__/helpers/redis-lua-fixture.ts`
- Replace: `__tests__/unit/queue-claim.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Add Wasmoon as a dev dependency.
- [ ] Build an atomic in-memory Redis command fixture that executes the exported Lua scripts unchanged.
- [ ] Add tests for two concurrent claims, unfinished settlement, lock-conflict-style return, expired recovery, and stale-token isolation.
- [ ] Run the queue state-machine test and confirm it passes against actual Lua execution.

### Task 3: Worker exception liveness

**Files:**
- Modify: `__tests__/unit/pipeline-worker-route.test.ts`
- Modify: `src/app/api/worker/pipeline/route.ts`

- [ ] Add failing tests for thrown lock acquisition, settlement, and release; each must still attempt self-chain.
- [ ] Run the worker route test and confirm the new cases fail at the missing wake-up.
- [ ] Refactor the route so cleanup steps are independent and wake-up executes from an outer final path.
- [ ] Re-run worker tests and confirm all exception paths pass.

### Task 4: Documentation and final verification

**Files:**
- Modify: `docs/TASK_RELIABILITY_RUNBOOK.md`
- Modify: `docs/SECURITY_REVIEW_2026-09-15.md`

- [ ] Document automatic GA replay, executable Lua coverage, and unconditional worker wake-up.
- [ ] Run `npm ci`, `npm test -- --runInBand --silent`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Run `git diff --check` and scan staged additions for credential signatures.
- [ ] Commit all implementation and test changes without pushing or deploying.
