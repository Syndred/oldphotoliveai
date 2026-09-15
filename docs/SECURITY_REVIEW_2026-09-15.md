# Security review — 2026-09-15

Scope: the task reliability/analytics change and its production dependency tree.
No production credentials, Redis data, analytics settings or paid model calls
were used.

## Checks and remediations

- `git diff --check` passed.
- A high-entropy credential scan of source, tests, messages and documentation
  found no likely secret or private-key material. Existing deployment examples
  and test-only placeholder assignments were excluded as non-credentials.
- Analytics now allowlists bounded event names and parameters. Result paths and
  page locations for every configured locale are normalized before the first
  GA4 page view; task IDs, storage keys, queries and raw errors are not sent.
  Terminal-event deduplication is committed only after GA accepts the event;
  a bounded queue replays pre-initialization events without exposing task IDs.
- Status responses expose a finite failure code/stage but never
  `internalErrorMessage` or the content-policy diagnostic flag.
- Task creation and retry use validated Redis Lua inputs and key types before
  the write sequence. The same request is recoverable without a second quota or
  trial charge.
- Worker dequeue uses tokenized processing leases. Expired unfinished claims are
  recovered, lock conflicts and unexpected exceptions requeue atomically, and
  recovered terminal tasks are acknowledged without re-execution. Lock renewal
  and release are atomic token comparisons, closing the previous check/act race.
  Next.js `after()` binds execution to the platform lifecycle. Normal successful
  work can self-chain, while lock conflicts and worker, settlement, or release
  errors stop. A failed settlement deliberately leaves its processing lease for
  atomic expiry recovery, eliminating both failure hot loops and future-dated
  requests with no real scheduler. Authenticated status observation uses a
  global Redis `SET NX EX` marker to wake at most one worker per minute. REST
  status schedules the bounded wakeup with `after()`; SSE awaits it for at most
  two seconds before opening the long-lived stream, then nonterminal polls invoke
  it without awaiting so an already-open stream can recover expired work without
  delaying status events. A Hobby-compatible authenticated daily cron provides
  cold recovery if no result page is observed.
- All worker cron GET handlers fail closed. A missing or incorrect
  `CRON_SECRET` returns 401 for pipeline, cleanup, and quota reset; their POST
  handlers continue to require `WORKER_SECRET`.
- `npm audit fix` without `--force` updated compatible dependencies, including
  next-auth 4.24.15, next-intl 4.14.5 and the AWS XML builder chain. Direct
  image/ID dependencies were updated to sharp 0.35.4 and uuid 14.0.2. The
  production audit count initially fell from 11 findings (2 critical, 5 high)
  to 2 findings (1 critical, 1 high).

## Framework security upgrade

Next.js and `eslint-config-next` are now pinned to 15.5.25, the newest stable
patch on the approved 15.5 line. Next.js 15 request APIs were migrated to async
`params` and `cookies()`, and the removed `NextRequest.ip` property was replaced
with normalized proxy headers. React remains on 18.3.1 because Next.js 15.5.25
explicitly supports it, reducing unrelated migration risk.

Next.js 15.5.25 still pins PostCSS 8.4.31, so npm would retain a high-severity
finding without intervention. The package override selects PostCSS 8.5.28 on
the same major API line. `npm ls` confirms both direct and Next.js consumers use
8.5.28, the production build completes, and the official-registry
`npm audit --omit=dev --audit-level=high` result is zero vulnerabilities.

## Environment validation still required

The queue scripts were executed in a real Lua VM with deterministic Redis command
state transitions, but no disposable live Redis instance was available. Before release,
run the atomic create/replay/retry and worker claim/recovery cases in a
non-production Upstash namespace and inspect the task, history, ready queue,
processing queue, quota and anonymous-trial keys. The exact procedure is in
`docs/TASK_RELIABILITY_RUNBOOK.md`.
