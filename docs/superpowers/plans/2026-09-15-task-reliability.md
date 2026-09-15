# Task Reliability Implementation Plan

> Execute inline using executing-plans; the user requested an autonomous, reviewable result in this existing isolated worktree.

**Goal:** Recover task creation safely and measure real task outcomes without leaking private data.

**Architecture:** A focused Redis Lua boundary commits quota, task and queue atomically and recovers duplicate inputs. Typed public task state drives frontend recovery and bounded, locally deduplicated analytics.

**Tech Stack:** Next.js 14, TypeScript, Upstash Redis, Jest/Testing Library.

## Tasks

- [x] Run the baseline suite and record the package-lock installation issue separately; after lock synchronization, all 49 baseline suites and 539 tests passed.
- [x] Add failing tests for simultaneous uploads, same-key creation replay, exhausted trial/quota, invalid payload and the atomic EVAL boundary. A disposable real Redis/Lua service was unavailable, so live script execution remains an explicit staging gate.
- [x] Implement `src/lib/task-creation.ts`: validated input, bounded result codes, atomic script, stable user/input/workflow digest and task/queue/history writes; use in both creation routes. Add visitor cookie to successful upload.
- [x] Add failing tests for authenticated/anonymous retries, content violation refusal, attempt increment, queue atomicity and repeated retry requests. Implement atomic retry + queue in Redis and use ownership-checked route for both access modes.
- [x] Add failing frontend tests for refusal classification and same-photo retry. Implement retained upload key and synchronous guards in UploadZone and both upload sections.
- [x] Add failing tests for private page sanitization, bounded analytics parameters, telemetry exceptions and task-attempt dedupe. Implement analytics helpers and normalized page views; preserve enablement and upstream consent.
- [x] Add failing tests for terminal status observation, anonymous failure actions, disconnect recovery and download requests. Extend public status shape and ResultPage/ProgressIndicator, classify finite pipeline errors. Native browser downloads are intentionally measured as requested, not falsely reported as saved.
- [x] Run all tests, typecheck, lint and build; verify the existing canonical, sitemap, colorizer and private-route behavior through the suite. Preserve existing canonical aliases and private noindex.
- [x] Save the event contract and staging gates in `docs/TASK_RELIABILITY_RUNBOOK.md`; complete self-review, dependency/credential security scans and the pre-commit verification gate. No push/deploy or GA production changes are authorized.
