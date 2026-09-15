# Next.js 15 Security Upgrade Design

## Goal

Remove all production high and critical npm advisories without taking the larger Next.js 16 migration, while preserving current routing, authentication, internationalization, image, analytics, and worker behavior.

## Decision

Pin `next` and `eslint-config-next` together at `15.5.25`, the newest stable release on the approved 15.5 line. Its published peer metadata accepts React 18.2, so React stays on the existing major version to minimize migration surface. `next-intl` remains on its already resolved 4.x release, which supports Next.js 15. Override Next's pinned PostCSS 8.4.31 with compatible PostCSS 8.5.28 so the production dependency graph also clears the remaining source-map and stringify advisories.

Continuing on Next.js 14 cannot satisfy the audit gate. Moving directly to Next.js 16 would add unrelated React and framework changes. The chosen path is therefore the smallest supported security upgrade.

## Compatibility Work

Next.js 15 makes request-bound APIs asynchronous. All App Router page, layout, route-handler `params`, and `cookies()` calls will be migrated to promises and awaited. Middleware remains `middleware.ts` because Next.js 15 supports it; its locale, authentication, canonical redirect, and API rate-limit behavior must remain covered by existing tests. The image optimizer stays disabled and no Server Actions are introduced.

The legacy `next lint` command remains available in Next.js 15, so the existing script is retained unless the upgraded binary proves otherwise.

## Worker Lifecycle

The pipeline POST endpoint registers execution with stable Next.js `after()` and returns immediately. The platform therefore keeps the long-running worker attached to the request lifecycle without making each predecessor wait for the full recursive chain. The route declares a 300-second duration. Normal successful work can immediately schedule the next task. Lock conflicts and worker or settlement errors stop without self-chaining. A failed settlement leaves its processing lease intact, so a later worker invocation can recover it atomically after expiry instead of relying on an in-process delay or an unbacked future-dated request.

Authenticated result-status observations use a global one-minute Redis `SET NX EX` marker before dispatching a wakeup, so polling provides timely expired-lease recovery without a request storm. REST status responses register this bounded dispatch with `after()`. The SSE route awaits the same short, timeout-protected dispatch before constructing the long-lived stream, ensuring a stream-only result page does not defer its first wakeup until disconnect. While that stream remains open, each nonterminal status poll requests the same wakeup without awaiting it; the Redis marker suppresses duplicate worker POSTs while allowing recovery after the throttle or processing lease expires. A Hobby-compatible authenticated daily Vercel cron is the cold fallback. All three worker cron GET routes reject missing or incorrect `CRON_SECRET` values.

## Fenced Provider Recovery

Every claimed execution uses the queue claim's unique lease member as its fencing token. After the task lock is acquired, the worker atomically verifies the exact unexpired processing claim and current lock token before installing that token on the nonterminal task. Every stage, provider-invocation, failure, and completion write compares the stored token before replacing task state. A recovered claim installs a new token, so an older worker can finish an in-flight network request but cannot publish any later state.

Replicate work uses the prediction lifecycle instead of the convenience `run()` call. Spend is reserved before entering the ambiguous-create boundary. Immediately before a create request, the worker persists a stage-scoped `provider_creation_started` record. It submits exactly one direct HTTP create POST because the SDK transport can retry POST failures internally, immediately persists the prediction ID as `active`, and polls that ID with the SDK's safe `predictions.get` semantics. A recovered worker with a durable prediction ID only polls the saved ID. Definitive non-timeout 4xx rejections remain retryable. If creation may have reached Replicate but no ID is durably known, the invocation becomes `creation_unknown`, the task fails with `provider_creation_unknown`, automatic/manual retry is disabled, and the already-consumed task allowance is neither refunded nor charged again. This conservative manual-review path prevents duplicate paid predictions when a create response is lost.

Any failed or rejected lease renewal aborts the worker's execution signal. Pipeline ownership checks surround long-running local work and all Redis writes, preventing later stages after ownership loss. Replicate create and polling calls receive the same abort signal; if a client ignores cancellation and returns late, fencing still rejects the old result.

## Evidence and Release Gate

The dependency change itself provides the red phase: typecheck/build must expose every incompatible synchronous API before those sources are changed. After migration, run the complete Jest suite, typecheck, lint, production build, focused SEO/route tests, and production-only npm audit against the official registry. High and critical production advisories must be zero. Run diff and credential checks, commit locally, and keep the worktree clean without pushing or deploying.
