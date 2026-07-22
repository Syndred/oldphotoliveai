import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import ShowcaseSection from "@/app/sections/ShowcaseSection";
import VideoShowcaseSection from "@/app/sections/VideoShowcaseSection";
import HowItWorksSection from "@/app/sections/HowItWorksSection";
import FAQSection from "@/app/sections/FAQSection";
import UploadSection from "@/app/sections/UploadSection";
import ToolCardsSection from "@/components/tool/ToolCardsSection";
import {
  getToolPage,
  getToolPagePath,
  getToolSectionCopy,
  type ToolPageSlug,
} from "@/content/tool-pages";
import { Link } from "@/i18n/navigation";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

interface ToolLandingPageProps {
  locale: Locale;
  slug: ToolPageSlug;
}

export default function ToolLandingPage({
  locale,
  slug,
}: ToolLandingPageProps) {
  const tool = getToolPage(locale, slug);
  const toolPath = getToolPagePath(slug);
  const sectionCopy = getToolSectionCopy(locale);

  const jsonLd = [
    buildBreadcrumbJsonLd(
      [
        { name: sectionCopy.homeLabel, path: "/" },
        { name: tool.cardTitle, path: toolPath },
      ],
      locale
    ),
    buildFaqJsonLd(tool.faqs),
    buildSoftwareApplicationJsonLd({
      name: tool.cardTitle,
      description: tool.description,
      path: toolPath,
      locale,
      keywords: tool.keywords,
    }),
  ];

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main>
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] px-5 py-8 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:px-8 sm:py-10">
            <div className="grid items-stretch gap-8 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="flex h-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  {tool.eyebrow}
                </p>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-5xl">
                  {tool.heroTitle}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {tool.heroDescription}
                </p>

                <div className="mt-6 grid gap-3">
                  {tool.heroHighlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-[var(--color-text-secondary)]"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>

              <UploadSection
                analyticsSource={tool.slug}
                variant="embedded"
                showHeader={false}
                className="h-full"
              />
            </div>

            <nav
              aria-label={`${tool.cardTitle} page sections`}
              className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5"
            >
              <a
                href="#upload-section"
                className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
              >
                {tool.primaryCtaLabel}
              </a>
              <a
                href="#showcase-section"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {tool.showcaseTitle}
              </a>
              <a
                href="#faq-section"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {tool.faqTitle}
              </a>
              <a
                href="#tool-pages-section"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {tool.relatedTitle}
              </a>
              <Link
                href="/pricing"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {sectionCopy.seePricingLabel}
              </Link>
            </nav>
          </div>
        </section>

        {tool.showcaseKind === "animation" ? (
          <VideoShowcaseSection
            title={tool.showcaseTitle}
            subtitle={tool.showcaseSubtitle}
          />
        ) : (
          <ShowcaseSection
            title={tool.showcaseTitle}
            rowIds={[tool.showcaseKind]}
            description={tool.showcaseSubtitle}
          />
        )}

        <section className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                {tool.benefitsTitle}
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {tool.benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5"
                >
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {locale === "en" && tool.guideSections?.length ? (
          <section className="px-4 py-10 sm:py-14">
            <div className="mx-auto max-w-5xl">
              <div className="space-y-8">
                {tool.guideSections.map((section) => (
                  <article key={section.title}>
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                      {section.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                      {section.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <HowItWorksSection />

        <section className="px-4 py-4 sm:py-6">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {tool.introTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {tool.introBody}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 p-6">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {tool.pricingTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {tool.pricingBody}
              </p>
              <Link
                href="/pricing"
                className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-[var(--color-accent)]/30 bg-black/15 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/50 hover:bg-black/25"
              >
                {sectionCopy.comparePlansLabel}
              </Link>
            </div>
          </div>
        </section>

        <FAQSection title={tool.faqTitle} items={tool.faqs} />

        <ToolCardsSection
          locale={locale}
          title={tool.relatedTitle}
          description={tool.relatedDescription}
          slugs={tool.relatedSlugs}
        />
      </main>

      <FooterSection />
    </div>
  );
}
