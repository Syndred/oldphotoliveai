# Task creation and result reliability

Scope approved in the delegated audit request: preserve no-login animation and the existing colorizer landing pages; fix reproducible defects, not inferred historical causes.

## Evidence and decision

Baseline `cbc3f48292fc9f7e970c2d49f832c872276a6516`, clean app-provided worktree, fetched `origin/master` at the same SHA. No repository AGENTS.md; the inherited `.codex/AGENTS.md` is empty. PROJECT_CONTEXT accurately identifies Redis/R2/Replicate but deployment documents incorrectly describe Stripe as disabled and pipeline wake-ups as guaranteed by cron. Actual pipeline has no scheduled cron.

Creation currently decrements quota/claims a permanent trial before independent task and queue writes. Exceptions leave consumed allowance without a queued task. UploadZone accepts a second drop while uploading. SSE disconnect is presented as task failure, with an authenticated retry button even for anonymous results. Creation analytics lack failure classification; page views include private IDs and arbitrary query strings.

Prefer an atomic Redis creation script (quota + task + history + queue + dedupe) over adding retries to non-idempotent POSTs or compensating refunds. Validate Redis key types and payload before writes: Redis Lua does not roll back runtime errors. Same user, upload storage key and workflow recover the original task without charging again; different inputs follow existing allowance rules. Anonymous trial remains one per visitor; establish visitor cookie during successful upload. Legacy `claimed` records remain conservative and need controlled investigation, not mass deletion.

## Frontend and telemetry

Use a synchronous upload/create guard. Retain uploaded storage key for explicit creation recovery without another upload. Expected auth/quota/input/rate-limit refusals use rejected events; transport/server failures use failed events with bounded codes. GA receives no IDs, keys, photos, raw errors or arbitrary URLs. Result state is emitted only when read from status/SSE; once-per-task-attempt dedupe stays local. Observed running, completed/failed/cancelled, result view and download request/success are separate. A successful browser blob download event means bytes received and browser save initiated, not proof a file was saved to disk. Disconnected status observation is not generation failure. Existing deployment analytics enablement is preserved; no explicit consent UI exists, and upstream denied consent must not be overridden.

Retry the original task without additional allowance as the current business behavior does; disallow content violations and allow anonymous technical-failure recovery using existing ownership checks. Persist attempt count and finite failure codes, do not expose internal errors. No refunds or paid plan changes are introduced.

## Verification and boundaries

Tests first for upload concurrency, creation rejection/recovery, atomic Lua semantics, terminal observation, disconnect behavior, download and URL sanitization. Run complete Jest, typecheck, lint and build. Use local/dummy configuration only, no production data writes or paid model runs. Verify core canonical/links and existing noindex through tests and rendered HTML. Document remaining staging/environment checks and release steps.
