# Colorizer SEO migration — 2026-09-11

## Implemented

- Middleware returns HTTP 301 for `/en` → `/`, and `/colorize`, `/en/colorize`, `/en/colorize-old-photos` → `/colorize-old-photos`. Query strings are preserved.
- English uses unprefixed URLs throughout. Other `/en/*` links also permanently redirect to their unprefixed equivalents, consistent with next-intl `as-needed`. Language detection is disabled for page routing so cookies and browser preferences cannot redirect canonical English URLs.
- `/colorize-old-photos` now renders the actual tool instead of redirecting back to `/colorize`. Translated `/zh/colorize`, `/es/colorize`, `/ja/colorize` redirect to their own translated long URLs.
- Shared URL helpers update canonicals, hreflang, sitemap, structured data, navigation and authentication callback paths. Blog colorizer links and tool cards use the canonical tool path.
- English homepage title: `AI Photo Colorizer - Colorize Old Photos Online Free`; H1: `Colorize Old Photos with AI`.
- English homepage upload uses the existing `colorize` workflow; Chinese, Spanish and Japanese retain their original `full` workflow. Copy explains colorization, black-and-white conversion, restoration preparation, and AI color uncertainty. Three dedicated H2 sections cover those functions. Animation landing pages remain available; the homepage no longer features the video showcase or animation recommendation block.

## Language and pricing decisions

Hreflang describes relationships between real translated pages; it cannot replace those pages. Chinese, Spanish and Japanese routes and content remain available with self-canonicals and language alternates. English and x-default point to unprefixed English URLs.

“Free” is supported by `src/lib/quota.ts`: free accounts receive a daily limit of one. Homepage copy explicitly describes a daily account quota, not unlimited free use. The homepage upload still requires sign-in. No live paid AI generation was triggered during validation.

The attachment's search-volume and ranking claims were not independently verified or added to the website. No ranking or traffic improvements are promised.

## Verification

- `npm test -- --runInBand --silent`
- `npm run typecheck`
- `npm run build`
- Start the production build with `npm run start -- --hostname localhost --port 43189`, then run `node scripts/check-colorizer-seo.mjs`.
- HTTP checks cover exact 301 status, query preservation, destination 200 responses, English stability with Chinese cookies/headers, four languages, canonical/hreflang, homepage title/H1, and sitemap alias exclusion.
- Use a consistent hostname for the local Next.js server and requests. Binding to `127.0.0.1` while Next.js normalizes rewrites to `localhost` can cause external rewrite requests in this local environment.

## Review follow-up

- Removed hardcoded `/en` canonicals from all four English animation landing pages. They now use `absoluteLocalizedUrl("en", page.path)`, including their non-English noindex variants that display the English content.
- Changed the PWA start URL from the legacy `/en` alias to `/`.
- Preserved the full restoration/colorization/animation workflow on non-English homepages, consistent with their existing copy. Regression tests exercise task creation for all three languages.
- Replaced the colorizer description's unsupported “no signup” statement with an explicit sign-in and daily free quota explanation. The dedicated anonymous animation tool remains unchanged.
- Extended production HTTP checks to all four animation destinations, their 301 aliases, and the colorizer description.

No push or deployment is included. Production SEO changes take effect only after a later deployment; indexing changes require search-engine recrawling.

## Pre-push verification
- User subsequently authorized commit and push. Final parent verification passed: 49 test suites / 539 tests, typecheck, and production HTTP smoke checks on localhost:43972 covering all canonical, redirect, language and sitemap assertions. Online deployment remains unverified.
