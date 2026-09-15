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
  Terminal-event deduplication is committed only after GA accepts the event.
- Status responses expose a finite failure code/stage but never
  `internalErrorMessage` or the content-policy diagnostic flag.
- Task creation and retry use validated Redis Lua inputs and key types before
  the write sequence. The same request is recoverable without a second quota or
  trial charge.
- Worker dequeue uses tokenized processing leases. Expired unfinished claims are
  recovered, lock conflicts and unexpected exceptions requeue atomically, and
  recovered terminal tasks are acknowledged without re-execution. Lock renewal
  and release are atomic token comparisons, closing the previous check/act race.
- `npm audit fix` without `--force` updated compatible dependencies, including
  next-auth 4.24.15, next-intl 4.14.5 and the AWS XML builder chain. Direct
  image/ID dependencies were updated to sharp 0.35.4 and uuid 14.0.2. The
  production audit count fell from 11 findings (2 critical, 5 high) to 2
  findings (1 critical, 1 high).

## Remaining dependency risk

Both remaining production findings are attached to Next.js 14.2.35 and its
bundled PostCSS version. The audit's available remediation is Next.js 16.3.5,
which is a breaking framework migration and also requires aligned React,
middleware, lint and route-contract validation. `npm audit fix --force` was not
used because silently crossing two Next.js major versions would be a higher
release risk than a reviewed migration.

Treat the Next.js 16 migration as an urgent, separate release gate. Until then,
retain the current managed Linux deployment boundary, do not self-host this
version on Windows, keep image optimization and rewrite destinations tightly
allowlisted, and monitor for abnormal request volume/cache behavior. These
mitigations reduce exposure but do not remove the advisories.

## Environment validation still required

The Lua scripts were tested at the application/EVAL boundary with deterministic
fixtures, but no disposable real Redis instance was available. Before release,
run the atomic create/replay/retry and worker claim/recovery cases in a
non-production Upstash namespace and inspect the task, history, ready queue,
processing queue, quota and anonymous-trial keys. The exact procedure is in
`docs/TASK_RELIABILITY_RUNBOOK.md`.
