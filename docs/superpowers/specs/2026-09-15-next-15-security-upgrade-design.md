# Next.js 15 Security Upgrade Design

## Goal

Remove all production high and critical npm advisories without taking the larger Next.js 16 migration, while preserving current routing, authentication, internationalization, image, analytics, and worker behavior.

## Decision

Pin `next` and `eslint-config-next` together at `15.5.24`. This is the first explicitly approved secure target and its published peer metadata accepts React 18.2, so React stays on the existing major version to minimize migration surface. `next-intl` remains on its already resolved 4.x release, which supports Next.js 15.

Continuing on Next.js 14 cannot satisfy the audit gate. Moving directly to Next.js 16 would add unrelated React and framework changes. The chosen path is therefore the smallest supported security upgrade.

## Compatibility Work

Next.js 15 makes request-bound APIs asynchronous. All App Router page, layout, route-handler `params`, and `cookies()` calls will be migrated to promises and awaited. Middleware remains `middleware.ts` because Next.js 15 supports it; its locale, authentication, canonical redirect, and API rate-limit behavior must remain covered by existing tests. The image optimizer stays disabled and no Server Actions are introduced.

The legacy `next lint` command remains available in Next.js 15, so the existing script is retained unless the upgraded binary proves otherwise.

## Evidence and Release Gate

The dependency change itself provides the red phase: typecheck/build must expose every incompatible synchronous API before those sources are changed. After migration, run the complete Jest suite, typecheck, lint, production build, focused SEO/route tests, and production-only npm audit against the official registry. High and critical production advisories must be zero. Run diff and credential checks, commit locally, and keep the worktree clean without pushing or deploying.

