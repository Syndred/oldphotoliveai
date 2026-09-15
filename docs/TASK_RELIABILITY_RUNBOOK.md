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
and private result URLs are not sent. Detailed task correlation remains in
access-controlled server/Redis data.

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
6. In GA4 DebugView with internal/developer traffic isolated, verify the event
   sequence and dimensions. Confirm no task ID, object key, raw error, email or
   query string appears in event parameters or page location/title overrides.
7. Re-run `npm ci`, `npm test -- --runInBand`, `npm run typecheck`, `npm run lint`
   and `npm run build`, then deploy through the normal reviewed release path.

The automated suite mocks the Upstash `EVAL` boundary and verifies the scripts,
routes and client behavior. A real Lua/Redis integration test was intentionally
not run here because no disposable Redis service was available; step 2 and step
3 are release gates.
