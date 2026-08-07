# Replicate API Security Guide

Use this checklist before going live with paid image generation. Tokens live **only** in server env (`REPLICATE_API_TOKEN`) — never in frontend bundles or `NEXT_PUBLIC_*` vars.

## 1. Cost controls (required)

### Dashboard

1. Open [Replicate Billing](https://replicate.com/account/billing).
2. Prefer **prepaid credit** + auto-reload with a low threshold so a leaked token cannot run unbounded post-paid usage.
3. Note: Replicate **deprecated** the old “Monthly spend limit” UI (July 2025). If you still see it, set a comfortable ceiling (e.g. $50/mo); otherwise rely on prepaid credit + the in-app guard below.
4. Enable billing email alerts for unusual charges.

### In-app soft ceiling (already implemented)

Before every `runModel()` call we reserve an estimated USD amount in Redis (`replicate:spend:YYYY-MM`).

| Env var | Default | Purpose |
|---------|---------|---------|
| `REPLICATE_MONTHLY_SPEND_LIMIT_USD` | `50` | Estimated monthly budget |
| `REPLICATE_SPEND_GUARD_ENABLED` | `true` | Set `false` only for emergencies |

When the estimate would exceed the limit, generation fails with a capacity message (service paused for AI runs).

Estimates are intentionally conservative overestimates — see `MODEL_COST_ESTIMATE_USD` in `src/lib/replicate-spend.ts`.

The code also probes `GET https://api.replicate.com/v1/account` for token health. That endpoint does **not** return spend totals; Redis is the source of truth for the budget.

## 2. Keep the token off the client

- Frontend → your Next.js API (`/api/tasks`, `/api/anonymous-tasks`, worker) → Replicate.
- Model IDs and animation prompts are server-only constants in `src/lib/replicate.ts`.
- Never accept arbitrary model versions or prompts from the browser.

### IP / referer restrictions

Replicate API tokens historically do **not** offer reliable browser referer locking (the SDK runs server-side). Mitigations:

1. Restrict who can hit your **worker** routes (`WORKER_SECRET`).
2. Keep production deploy IPs/Vercel project private; rotate tokens if a deploy secret leaks.
3. If Replicate later adds IP allowlists on tokens, whitelist only your production egress IPs.

## 3. Key rotation

1. Create **at least two** tokens in [API tokens](https://replicate.com/account/api-tokens): `prod` + `backup`.
2. Store the active one in `REPLICATE_API_TOKEN` (Vercel / hosting env).
3. To rotate: set env to the backup token → redeploy → revoke the old token.

## 4. If you suspect abuse / theft

1. **Immediately revoke all tokens** in the Replicate dashboard.
2. Create a fresh token, update `REPLICATE_API_TOKEN`, redeploy.
3. Email [support@replicate.com](mailto:support@replicate.com) with timestamps and approximate spend.
4. Lower `REPLICATE_MONTHLY_SPEND_LIMIT_USD` temporarily and review Redis `replicate:spend:*` keys / Stripe disputes.

## 5. Related product protections

- OpenAI Moderation on source + generated images (`src/lib/moderation.ts`) — TOS: **no refunds** for rejected content.
- User quota / credits still apply; Professional unlimited does **not** bypass the Replicate monthly spend guard.
