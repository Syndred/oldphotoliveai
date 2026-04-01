# Google Ads Compliance Site Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a low-exposure About page and matching legal-page business details so the public site aligns with the April 1, 2026 Google Ads API Basic Access application.

**Architecture:** Reuse the existing App Router and `next-intl` legal-page pattern: create a new server-rendered About page, add localized wrappers and metadata, centralize business facts in `src/lib/site.ts`, and surface the same facts in the footer, Privacy Policy, and Terms of Service. Keep the homepage and navbar unchanged so the main product experience stays focused on AI old photo restoration.

**Tech Stack:** Next.js App Router, TypeScript, next-intl, Jest, Testing Library

---

## File Structure

- Create: `src/app/about/layout.tsx`
- Create: `src/app/about/page.tsx`
- Create: `src/app/[locale]/about/page.tsx`
- Modify: `src/app/sections/FooterSection.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/terms/page.tsx`
- Modify: `src/content/page-seo.ts`
- Modify: `src/lib/site.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `messages/en.json`
- Modify: `messages/zh.json`
- Modify: `messages/es.json`
- Modify: `messages/ja.json`
- Modify: `__tests__/unit/legal-pages.test.tsx`
- Create: `__tests__/unit/sitemap.test.ts`

### Responsibility Map

- `src/lib/site.ts`
  Stores the single source of truth for operator, business address, and support email.

- `src/app/about/layout.tsx`
  Generates metadata for the non-localized About route using translated copy.

- `src/app/about/page.tsx`
  Renders the public About page using the same visual shell as existing legal pages.

- `src/app/[locale]/about/page.tsx`
  Exposes the localized About route and localized metadata.

- `src/app/sections/FooterSection.tsx`
  Adds the About entry to footer navigation without exposing the address in the footer body.

- `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`
  Add a business information section with the operator name, support email, and address near the existing contact blocks.

- `src/content/page-seo.ts` and `src/app/sitemap.ts`
  Keep metadata and sitemap coverage aligned with the new route.

- `messages/*.json`
  Provide footer and About-page copy in all supported locales.

- `__tests__/unit/legal-pages.test.tsx` and `__tests__/unit/sitemap.test.ts`
  Verify localized footer links, About page rendering, legal-page business details, and sitemap coverage for `/about`.

### Task 1: About Route and Footer Entry

**Files:**
- Create: `src/app/about/layout.tsx`
- Create: `src/app/about/page.tsx`
- Create: `src/app/[locale]/about/page.tsx`
- Modify: `src/app/sections/FooterSection.tsx`
- Modify: `src/lib/site.ts`
- Modify: `messages/en.json`
- Modify: `messages/zh.json`
- Modify: `messages/es.json`
- Modify: `messages/ja.json`
- Modify: `src/content/page-seo.ts`
- Test: `__tests__/unit/legal-pages.test.tsx`

- [ ] **Step 1: Write the failing About-page and footer tests**

```tsx
describe("FooterSection", () => {
  it("renders locale-prefixed about, privacy, and terms links", () => {
    mockLocale = "zh";
    __setMockLocale("zh");
    render(<FooterSection />);

    expect(screen.getByText("关于我们").closest("a")).toHaveAttribute(
      "href",
      "/zh/about"
    );
    expect(screen.getByText("隐私政策").closest("a")).toHaveAttribute(
      "href",
      "/zh/privacy"
    );
    expect(screen.getByText("服务条款").closest("a")).toHaveAttribute(
      "href",
      "/zh/terms"
    );
  });
});

describe("About page", () => {
  it("renders the about page with operator, support email, and business address", async () => {
    mockLocale = "en";
    __setMockLocale("en");
    render((await AboutPage()) as React.ReactElement);

    expect(
      screen.getByRole("heading", { name: "About OldPhotoLive AI" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Syndred Young/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "support@oldphotoliveai.com" })
    ).toHaveAttribute("href", "mailto:support@oldphotoliveai.com");
    expect(
      screen.getByText(
        /Yifu Building, Area 45, Bao'an District, Shenzhen, Guangdong Province, China/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/internal-only Google Ads workflow/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/unit/legal-pages.test.tsx`
Expected: FAIL with an import error for `@/app/about/page` and/or missing `about` translation keys in the footer.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/site.ts
export const BRAND_NAME = "OldPhotoLive AI";
export const SITE_URL = "https://oldphotoliveai.com";
export const SUPPORT_EMAIL = "support@oldphotoliveai.com";
export const BUSINESS_OPERATOR = "Syndred Young";
export const BUSINESS_ADDRESS =
  "Yifu Building, Area 45, Bao'an District, Shenzhen, Guangdong Province, China";
```

```tsx
// src/app/sections/FooterSection.tsx
const FOOTER_LINKS = [
  { href: "/", key: "home" as const },
  { href: "/about", key: "about" as const },
  { href: "/pricing", key: "pricing" as const },
  { href: "/privacy", key: "privacy" as const },
  { href: "/terms", key: "terms" as const },
] as const;
```

```tsx
// src/app/about/page.tsx
import { getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import { Link } from "@/i18n/navigation";
import {
  BRAND_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_OPERATOR,
  SUPPORT_EMAIL,
} from "@/lib/site";

export default async function AboutPage() {
  const t = await getTranslations("legal.about");

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />
      <main className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_68%)]" />
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
          <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="border-b border-white/10 px-5 py-8 sm:px-8 sm:py-10">
              <span className="inline-flex items-center rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
                {t("eyebrow")}
              </span>
              <h1 className="mt-4 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {t("description")}
              </p>
            </div>
            <div className="space-y-4 px-5 py-6 sm:px-8 sm:py-8">
              <section className="rounded-2xl border border-white/8 bg-black/10 p-5 text-sm leading-7 text-[var(--color-text-secondary)] sm:p-6 sm:text-base">
                {t("intro", { brandName: BRAND_NAME })}
              </section>
              <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
                  {t("operatorTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {t("operatorBody", {
                    operator: BUSINESS_OPERATOR,
                    brandName: BRAND_NAME,
                  })}
                </p>
              </section>
              <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
                  {t("contactTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {t("contactBody")}
                </p>
                <p className="mt-4 text-sm text-[var(--color-text-primary)]">{BUSINESS_OPERATOR}</p>
                <a className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-[var(--color-accent)]/30 bg-black/15 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/50 hover:bg-black/25" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {BUSINESS_ADDRESS}
                </p>
              </section>
              <section className="rounded-2xl border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/8 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
                  {t("adsTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {t("adsBody")}
                </p>
              </section>
              <div className="flex justify-start border-t border-white/10 pt-2">
                <Link href="/privacy" className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.06] hover:text-white">
                  {t("privacyLink")}
                </Link>
              </div>
            </div>
          </article>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
```

```tsx
// src/app/about/layout.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.about");

  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/about",
  });
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

```tsx
// src/app/[locale]/about/page.tsx
import type { Metadata } from "next";
import AboutPage from "@/app/about/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedAboutPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedAboutPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].about;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/about",
  });
}

export default function LocalizedAboutPage() {
  return <AboutPage />;
}
```

```ts
// src/content/page-seo.ts
interface SeoDictionary {
  home: PageSeoContent;
  pricing: PageSeoContent;
  login: PageSeoContent;
  history: PageSeoContent;
  result: PageSeoContent;
  about: PageSeoContent;
  privacy: PageSeoContent;
  terms: PageSeoContent;
}
```

```json
// messages/en.json
{
  "landing": {
    "footer": {
      "links": {
        "about": "About"
      }
    }
  },
  "legal": {
    "about": {
      "eyebrow": "About",
      "title": "About OldPhotoLive AI",
      "description": "Learn who operates OldPhotoLive AI and how to contact the business.",
      "intro": "{brandName} is an AI-powered old photo restoration service built for overseas users who want to restore, colorize, and animate old family photos online.",
      "operatorTitle": "Operator",
      "operatorBody": "{brandName} is operated by {operator}, the sole owner and operator of the service.",
      "contactTitle": "Business Contact",
      "contactBody": "For business, customer support, or compliance inquiries, please use the official email below.",
      "adsTitle": "Internal Advertising Operations",
      "adsBody": "We use an internal-only Google Ads workflow for keyword research, campaign setup support, and performance reporting for OldPhotoLive AI. This workflow is not offered to third parties.",
      "privacyLink": "View Privacy Policy"
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/unit/legal-pages.test.tsx`
Expected: PASS with the new About-page test and localized footer assertions succeeding.

- [ ] **Step 5: Commit**

```bash
git add __tests__/unit/legal-pages.test.tsx src/app/about/layout.tsx src/app/about/page.tsx src/app/[locale]/about/page.tsx src/app/sections/FooterSection.tsx src/content/page-seo.ts src/lib/site.ts messages/en.json messages/zh.json messages/es.json messages/ja.json
git commit -m "feat: add about page for google ads compliance"
```

### Task 2: Align Privacy and Terms with Submitted Business Details

**Files:**
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/terms/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/zh.json`
- Modify: `messages/es.json`
- Modify: `messages/ja.json`
- Test: `__tests__/unit/legal-pages.test.tsx`

- [ ] **Step 1: Write the failing legal-page business info tests**

```tsx
it("renders business information on the privacy page", async () => {
  mockLocale = "en";
  __setMockLocale("en");
  render((await PrivacyPolicyPage()) as React.ReactElement);

  expect(
    screen.getByRole("heading", { name: "Business Information" })
  ).toBeInTheDocument();
  expect(screen.getByText("Syndred Young")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Yifu Building, Area 45, Bao'an District, Shenzhen, Guangdong Province, China"
    )
  ).toBeInTheDocument();
});

it("renders business information on the terms page", async () => {
  mockLocale = "en";
  __setMockLocale("en");
  render((await TermsOfServicePage()) as React.ReactElement);

  expect(
    screen.getAllByRole("heading", { name: "Business Information" }).length
  ).toBeGreaterThan(0);
  expect(screen.getByText("Syndred Young")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Yifu Building, Area 45, Bao'an District, Shenzhen, Guangdong Province, China"
    )
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/unit/legal-pages.test.tsx`
Expected: FAIL because the `Business Information` section does not exist on the privacy or terms pages yet.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// src/app/privacy/page.tsx
import {
  BUSINESS_ADDRESS,
  BUSINESS_OPERATOR,
  SUPPORT_EMAIL,
} from "@/lib/site";
```

```tsx
// add inside src/app/privacy/page.tsx before the related-link block
<section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
    {t("businessInfoTitle")}
  </h2>
  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
    {t("businessInfoBody")}
  </p>
  <p className="mt-4 text-sm text-[var(--color-text-primary)]">{BUSINESS_OPERATOR}</p>
  <a
    className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.06] hover:text-white"
    href={`mailto:${SUPPORT_EMAIL}`}
  >
    {SUPPORT_EMAIL}
  </a>
  <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
    {BUSINESS_ADDRESS}
  </p>
</section>
```

```tsx
// src/app/terms/page.tsx
import {
  BUSINESS_ADDRESS,
  BUSINESS_OPERATOR,
  SUPPORT_EMAIL,
} from "@/lib/site";
```

```tsx
// add inside src/app/terms/page.tsx before the related-link block
<section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
    {t("businessInfoTitle")}
  </h2>
  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
    {t("businessInfoBody")}
  </p>
  <p className="mt-4 text-sm text-[var(--color-text-primary)]">{BUSINESS_OPERATOR}</p>
  <a
    className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.06] hover:text-white"
    href={`mailto:${SUPPORT_EMAIL}`}
  >
    {SUPPORT_EMAIL}
  </a>
  <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
    {BUSINESS_ADDRESS}
  </p>
</section>
```

```json
// messages/en.json
{
  "legal": {
    "privacy": {
      "businessInfoTitle": "Business Information",
      "businessInfoBody": "OldPhotoLive AI is operated by Syndred Young. The following contact details are provided for business, customer support, and compliance requests."
    },
    "terms": {
      "businessInfoTitle": "Business Information",
      "businessInfoBody": "OldPhotoLive AI is operated by Syndred Young. The following contact details apply to legal, business, and compliance matters."
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/unit/legal-pages.test.tsx`
Expected: PASS with the new business-information assertions on both legal pages.

- [ ] **Step 5: Commit**

```bash
git add __tests__/unit/legal-pages.test.tsx src/app/privacy/page.tsx src/app/terms/page.tsx messages/en.json messages/zh.json messages/es.json messages/ja.json
git commit -m "feat: add business details to legal pages"
```

### Task 3: Metadata, Sitemap, and Verification

**Files:**
- Modify: `src/content/page-seo.ts`
- Modify: `src/app/sitemap.ts`
- Test: `__tests__/unit/sitemap.test.ts`

- [ ] **Step 1: Write the failing sitemap test**

```ts
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes localized about pages", () => {
    const entries = sitemap();
    const aboutUrls = entries
      .map((entry) => entry.url)
      .filter((url) => /\/(en|zh|es|ja)\/about$/.test(url));

    expect(aboutUrls).toEqual([
      "https://oldphotoliveai.com/en/about",
      "https://oldphotoliveai.com/zh/about",
      "https://oldphotoliveai.com/es/about",
      "https://oldphotoliveai.com/ja/about",
    ]);

    const enAbout = entries.find(
      (entry) => entry.url === "https://oldphotoliveai.com/en/about"
    );

    expect(enAbout?.alternates?.languages?.["x-default"]).toBe(
      "https://oldphotoliveai.com/en/about"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/unit/sitemap.test.ts`
Expected: FAIL because `/about` is not included in `src/app/sitemap.ts`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/content/page-seo.ts
export const PAGE_SEO_COPY: Record<Locale, SeoDictionary> = {
  en: {
    about: {
      title: "About OldPhotoLive AI",
      description:
        "Learn who operates OldPhotoLive AI, how to contact the business, and how internal advertising operations support the service.",
    },
  },
  zh: {
    about: {
      title: "关于 OldPhotoLive AI",
      description: "了解 OldPhotoLive AI 的运营者、联系方式和业务信息。",
    },
  },
  es: {
    about: {
      title: "Acerca de OldPhotoLive AI",
      description:
        "Conoce quién opera OldPhotoLive AI, cómo contactar con el negocio y cómo se gestionan las operaciones publicitarias internas.",
    },
  },
  ja: {
    about: {
      title: "OldPhotoLive AI について",
      description:
        "OldPhotoLive AI の運営者、連絡先、社内広告運用の概要を案内します。",
    },
  },
};
```

```ts
// src/app/sitemap.ts
const staticRoutes = [
  {
    path: "/",
    lastModified: new Date("2026-03-18T00:00:00.000Z"),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/about",
    lastModified: new Date("2026-04-01T00:00:00.000Z"),
    changeFrequency: "monthly",
    priority: 0.4,
  },
  {
    path: "/pricing",
    lastModified: new Date("2026-03-18T00:00:00.000Z"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
];
```

- [ ] **Step 4: Run tests and typecheck to verify everything passes**

Run: `npm test -- --runInBand __tests__/unit/legal-pages.test.tsx __tests__/unit/sitemap.test.ts`
Expected: PASS with both test files succeeding.

Run: `npm run typecheck`
Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add __tests__/unit/sitemap.test.ts src/app/sitemap.ts src/content/page-seo.ts
git commit -m "chore: add about page seo and sitemap coverage"
```

## Self-Review

### Spec coverage

- About page requirement: covered by Task 1.
- Footer discoverability requirement: covered by Task 1.
- Legal-page business info requirement: covered by Task 2.
- SEO and sitemap requirement: covered by Task 3.
- Test coverage requirement: covered by Tasks 1 through 3.

No spec gaps found.

### Placeholder scan

- No `TBD`, `TODO`, or deferred implementation language remains.
- Each task includes concrete file paths, code snippets, commands, and expected outcomes.

### Type consistency

- The plan consistently uses `BUSINESS_OPERATOR`, `BUSINESS_ADDRESS`, and `SUPPORT_EMAIL` from `src/lib/site.ts`.
- The plan consistently uses the `legal.about` translation namespace and `PAGE_SEO_COPY[locale].about`.
- The localized route path is consistently `/about`.
