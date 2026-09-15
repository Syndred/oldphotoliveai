# Task reliability and measurement runbook

This change separates task acceptance from model execution and measures only
server-authoritative states observed through the protected status APIs. It does
not reinterpret historical GA4 event counts as users or completed generations.

## Event contract

| Stage | Event | Meaning |
| --- | --- | --- |
| Create | `task_create_started` / `anonymous_task_create_started` | One browser request was initiated. |
| Create | `task_create_rejected` / `anonymous_task_create_rejected` | Expected authentication, quota, trial, validation or rate-limit refusal. |
| Create | `task_create_failed` / `anonymous_task_create_failed` | Technical request/server failure; safe same-photo recovery is offered. |
| Create | `task_create_succeeded` / `anonymous_task_create_succeeded` | Redis committed the task, history and queue together, or recovered that same committed task. |
| Run | `generation_started` | Protected task status reached restoring, colorizing or animating. |
| Run | `generation_completed` / `generation_failed` / `generation_cancelled` | Protected task status reached that terminal state. |
| Result | `result_view` | A completed result was rendered. |
| Result | `result_download_requested` | The user invoked a protected asset download. Browser APIs cannot prove that the file was saved to disk. |
| Recovery | `generation_retry_requested` / `generation_retry_accepted` / `generation_retry_failed` | A no-extra-allowance retry was requested and accepted or failed. |
| Transport | `status_stream_disconnected` | Result-status SSE disconnected; this is not a generation failure. |

Lifecycle events are deduplicated locally by task and attempt. GA4 receives only
allowlisted, bounded dimensions such as workflow, access mode, stage and finite
failure code. Task IDs, storage keys, email addresses, raw errors, query strings
and private result URLs are not sent. Result routes for every configured locale
are reduced to `/[locale/]result/:taskId` before `page_path` and `page_location`
are constructed. A lifecycle event is marked as sent only after the GA function
accepts it. Events rendered before GA initialization enter a deduplicated,
100-entry in-memory queue and are replayed automatically on `opla-ga-ready`;
they do not depend on a second page render.
Detailed task correlation remains in access-controlled server/Redis data.

## Worker claim contract

The ready queue is `queue:tasks`; active claims are leases in
`queue:tasks:processing`. Claiming first restores expired, unfinished leases and
then atomically moves one ready item into the processing set. The worker renews
the queue lease with its task lock. Settlement reads the persisted task state in
the same Redis script: completed, failed, cancelled, missing or invalid tasks
are acknowledged, while unfinished tasks return to the ready queue at their
original priority score. Every claim has a unique token, so a late worker cannot
acknowledge or requeue a newer claim for the same task. Task-lock renewal and
release also compare the ownership token and act in one Redis script, preventing
an expired worker from extending or deleting a successor's lock.

The pipeline dispatch endpoint registers execution with Next.js `after()` and
returns before long-running model work begins. The platform keeps that lifecycle
task alive after the response without making earlier workers wait for the full
recursive chain. Normal successful work can immediately schedule the next ready
task. Lock conflicts and worker, settlement, or lock-release errors stop without
self-chaining, avoiding a request hot loop. If settlement fails, the tokenized
processing lease remains the durable recovery record. A later worker invocation
recovers the unfinished claim after lease expiry; there is no in-process delay or
future-dated request that can be acknowledged without actually being scheduled.

Authenticated REST/SSE status observation requests a worker wakeup through a
global Redis `SET NX EX` marker, limiting high-frequency polling to one dispatch
per minute while still recovering expired leases. REST status uses Next.js
`after()`. SSE awaits the same error-isolated request with a two-second upper
bound before constructing its long-lived response, so a stream-only client does
not wait for disconnect before its first dispatch. Every later nonterminal SSE
poll requests the same wakeup without awaiting it, so status delivery stays
responsive while the one-minute Redis marker suppresses duplicate worker POSTs.
A Hobby-compatible daily cron is the cold fallback when nobody is observing a
result. Pipeline, cleanup, and quota-reset cron GET requests all require a
configured matching `CRON_SECRET`; missing configuration fails closed with 401.
Pipeline lifecycle work has a 300-second route duration, after which the existing
queue and lock leases remain the recovery source of truth.

## Failure codes

Expected creation refusal codes are `anonymous_trial_used`,
`daily_quota_exhausted`, `no_credits`, `quota_not_initialized`,
`invalid_input`, `rate_limited` and `unauthorized`. Technical creation failures
use `internal_error` or `network_or_server`.

Pipeline status exposes only `content_rejected`, `source_unreachable`,
`service_busy`, `provider_auth`, `provider_config`, `download_failed` or
`processing_failed`, plus an optional stage. Raw provider errors remain server
side. Content-policy failures cannot be retried. Other failed tasks can be
requeued atomically without another allowance charge, including a task owned by
the original anonymous visitor cookie.

## Staging validation before release

1. Use a disposable Redis namespace and non-billable provider stubs. Do not use
   production credentials or a paid model request.
2. Submit the same authenticated create request twice. Confirm both responses
   resolve to one task, one history member, one queue member and one allowance
   decrement.
3. Repeat the lost-response scenario for the no-login flow. The same uploaded
   storage key must reopen the existing task; a different key must receive the
   used-trial refusal.
4. Force a technical pipeline failure, retry once and confirm `attemptCount`
   increments while quota/credits do not change. Confirm policy failures have no
   retry action.
5. Interrupt the SSE connection while the worker continues. Confirm the UI says
   the connection was lost, reconnects automatically and does not emit
   `generation_failed` until the task itself is failed.
6. In the disposable Redis namespace, force a worker exception and a task-lock
   conflict. Confirm the unfinished task returns to `queue:tasks`. Let a claim
   lease expire, invoke the worker again, and confirm it is recovered. Repeat
   with a completed task and confirm the pipeline is not executed twice. Confirm
   lock conflicts and worker/settlement errors do not self-chain. Confirm an
   observer wake before processing-lease expiry claims nothing, a later observer
   wake recovers the expired claim, repeated status polling creates at most one
   dispatch per minute, and a stream-only client dispatches before its first SSE
   event and again from later nonterminal polls after the throttle expires. The
   authenticated daily cron must still recover cold work with no observer.
7. In GA4 DebugView with internal/developer traffic isolated, verify the event
   sequence and dimensions. Confirm no task ID, object key, raw error, email or
   query string appears in event parameters or page location/title overrides.
   Include `/result/<id>`, `/en/result/<id>` and `/zh/result/<id>` with query and
   fragment text, and test a terminal render before and after GA initialization.
8. Re-run `npm ci`, `npm test -- --runInBand`, `npm run typecheck`, `npm run lint`
   and `npm run build`, then deploy through the normal reviewed release path.

The automated suite executes the production claim and settlement scripts in the
official Lua VM compiled to WebAssembly, backed by a deterministic Redis-command
fixture. It also verifies routes and real client lifecycle behavior. A live
Redis integration test was intentionally not run here because no disposable
Redis service was available; steps 2, 3 and 6 remain release gates.
