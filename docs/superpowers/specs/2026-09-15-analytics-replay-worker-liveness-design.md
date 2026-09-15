# Analytics Replay and Worker Liveness Design

## Scope

Close the two remaining review findings without changing product-facing task,
quota, or billing behavior. No production services or deployment are involved.

## Analytics lifecycle

`trackTaskEventOnce` remains the only task-aware API. When GA is unavailable it
stores a sanitized event in a module-local `Map`, keyed by event name, task ID,
and attempt. The map is bounded to 100 unique entries and replaces duplicates.
One `opla-ga-ready` listener drains it. A drained event is removed only after
`gtag` accepts it; the local once marker is then persisted. Task IDs are used
only in the local key and never enter event parameters.

The ResultPage lifecycle test will use the real analytics module. A completed
REST response will enqueue `generation_completed` and `result_view` once while
GA is absent; after `opla-ga-ready`, each event must be delivered exactly once
without the task ID.

## Queue state machine evidence

Tests will run the exported Redis Lua scripts in Wasmoon, the official Lua VM
compiled to WebAssembly. A small in-memory Redis command fixture supplies the
commands used by the scripts while preserving Redis script serialization. The
tests exercise the actual script text and state transitions for concurrent
claim exclusion, unfinished settlement, expired-lease recovery, and stale-token
isolation.

## Worker liveness

The worker route will have one outer completion path. Claim, lock acquisition,
pipeline work, claim settlement, and lock release may each fail independently;
all caught errors are retained while cleanup continues. A final best-effort
self-chain is always attempted whenever a task was claimed, including failures
from `acquireLock`, `settleTaskClaim`, or `releaseLock`. The original error is
re-thrown after cleanup and wake-up, and cleanup errors are logged rather than
preventing subsequent cleanup steps.

## Verification

Regression tests cover analytics replay, bounded deduplication, executable Lua
state transitions, and every worker exception exit. Final verification runs the
complete Jest suite, typecheck, lint, production build, diff check, and secret
signature scan.
