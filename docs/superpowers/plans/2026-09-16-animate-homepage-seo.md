# Animate Homepage and SEO Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the production homepage around the existing restore → colorize → animate pipeline while consolidating English URLs and indexation.

**Architecture:** Keep the processing APIs and task workflows unchanged. Add server-rendered homepage copy/data and reuse existing production showcase assets; centralize locale indexation in the metadata helper; declare redirects in Next config; generate a deliberately small English-only sitemap.

**Tech Stack:** Next.js 15 App Router, React 18, next-intl, TypeScript, Jest, Tailwind CSS.

---

### Task 1: Lock SEO and content requirements with tests

**Files:**
- Create: `__tests__/unit/homepage-positioning.test.ts`
- Modify: `__tests__/unit/sitemap.test.ts`
- Create: `__tests__/unit/redirects.test.ts`
- Create: `__tests__/unit/indexing-metadata.test.ts`

- [ ] Add assertions for homepage metadata, pipeline content, ten FAQ entries, English-only sitemap entries, redirects, and noindex behavior.
- [ ] Run the focused tests and confirm they fail because the new behavior is absent.

### Task 2: Implement homepage content and SSR structure

**Files:**
- Create: `src/content/home-animation.ts`
- Create: `src/app/sections/HomeAnimationHero.tsx`
- Create: `src/app/sections/HomePipelineSection.tsx`
- Create: `src/app/sections/HomeTransformationSection.tsx`
- Create: `src/app/sections/HomeUseCasesSection.tsx`
- Modify: `src/components/HomePageView.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/sections/FAQSection.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] Add exact animate-focused metadata and content.
- [ ] Reuse existing production before/restored/colorized/animation assets with descriptive alt text.
- [ ] Render FAQ as native `details`/`summary` markup.
- [ ] Keep the existing `full` task workflow and upload implementation intact.

### Task 3: Correct page-specific How It Works copy

**Files:**
- Modify: `src/app/sections/HowItWorksSection.tsx`
- Modify: `src/components/tool/ToolLandingPage.tsx`
- Modify: `src/components/AnimationLandingPage.tsx`

- [ ] Make the shared component accept server-provided heading, subtitle, and three steps.
- [ ] Supply dedicated restore, animate, and bring-to-life copy without changing other page sections.

### Task 4: Consolidate URLs and indexing

**Files:**
- Modify: `next.config.mjs`
- Modify: `src/lib/seo.ts`
- Modify: selected route metadata files under `src/app/[locale]`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`

- [ ] Add explicit permanent legacy redirects plus `/en/:path*` fallback.
- [ ] Apply `noindex, follow` to non-English pages and selected English landing pages.
- [ ] Emit only `/`, `/animate`, `/bring-to-life`, `/pricing`, and `/about` in the sitemap.
- [ ] Disallow locale paths in robots while allowing normal crawling elsewhere.

### Task 5: Verify and publish

**Files:**
- Modify only files required by verification fixes.

- [ ] Run focused tests, full Jest suite, typecheck, lint, and production build.
- [ ] Inspect the final diff and ensure no product APIs or pipeline implementation changed.
- [ ] Commit to `master` and push to `origin/master`.
