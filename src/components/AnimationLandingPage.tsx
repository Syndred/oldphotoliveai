import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import FAQSection from "@/app/sections/FAQSection";
import HowItWorksSection from "@/app/sections/HowItWorksSection";
import UploadSection from "@/app/sections/UploadSection";
import VideoShowcaseSection from "@/app/sections/VideoShowcaseSection";
import {
  ANIMATION_LANDING_PAGE_SLUGS,
  getAnimationLandingPage,
  type AnimationLandingPageSlug,
} from "@/content/animation-landing-pages";
import { Link } from "@/i18n/navigation";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { absoluteLocalizedUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import {
  ANIMATE_HOW_IT_WORKS,
  BRING_TO_LIFE_HOW_IT_WORKS,
} from "@/content/home-animation";

interface AnimationLandingPageProps {
  locale: Locale;
  slug: AnimationLandingPageSlug;
}

export default function AnimationLandingPage({
  slug,
}: AnimationLandingPageProps) {
  const page = getAnimationLandingPage(slug);
  const isBringToLifeGuide = slug === "bring-to-life";
  const relatedPages = ANIMATION_LANDING_PAGE_SLUGS.filter(
    (relatedSlug) => relatedSlug !== slug
  ).map(getAnimationLandingPage);

  const jsonLd = [
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: page.cardTitle, path: page.path },
      ],
      "en"
    ),
    isBringToLifeGuide
      ? {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.cardTitle,
          description: page.description,
          url: absoluteLocalizedUrl("en", page.path),
        }
      : {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: page.cardTitle,
      description: page.description,
      url: absoluteLocalizedUrl("en", page.path),
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0.00",
        priceCurrency: "USD",
      },
        },
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
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[var(--color-text-secondary)]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-white">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-[var(--color-text-primary)]">
                  {page.cardTitle}
                </li>
              </ol>
            </nav>
            <div className="grid items-stretch gap-8 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="flex h-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  {page.eyebrow}
                </p>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-5xl">
                  {page.h1}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {page.heroDescription}
                </p>
                <div className="mt-6 grid gap-3">
                  {page.highlights.map((highlight) => (
                    <p
                      key={highlight}
                      className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-[var(--color-text-secondary)]"
                    >
                      {highlight}
                    </p>
                  ))}
                </div>
              </div>
              {isBringToLifeGuide ? (
                <aside className="flex h-full flex-col justify-center rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 p-6 sm:p-8">
                  <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                    Ready to animate your old photo?
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                    Use the dedicated animation tool to upload a portrait, review the generated motion, and keep this guide focused on preparation and respectful use.
                  </p>
                  <Link
                    href="/animate"
                    className="mt-6 inline-flex min-h-[44px] w-fit items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
                  >
                    Animate old photos with AI
                  </Link>
                </aside>
              ) : (
                <UploadSection
                  analyticsSource={`seo_${page.slug}`}
                  variant="embedded"
                  showHeader={false}
                  className="h-full"
                  workflow="animate"
                />
              )}
            </div>
          </div>
        </section>

        <VideoShowcaseSection
          title="Old photo animation examples"
          subtitle="See how a clear, centered portrait can become a short video with gentle motion."
        />

        <section className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 md:grid-cols-3">
              {page.benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5"
                >
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {benefit.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-5xl space-y-8">
            {page.guideSections.map((section) => (
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
        </section>

        <HowItWorksSection
          copy={
            locale === "en" && slug === "animate"
              ? ANIMATE_HOW_IT_WORKS
              : locale === "en" && slug === "bring-to-life"
                ? BRING_TO_LIFE_HOW_IT_WORKS
                : undefined
          }
        />
        <FAQSection title={page.faqTitle} items={page.faqs} />

        <section className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                Related tools
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                Continue with the right old-photo workflow
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/no-login"
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
              >
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  No-login photo to video
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                  Try one watermarked, low-resolution video preview with no account.
                </p>
              </Link>
              <Link
                href="/restore-old-photos"
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
              >
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Restore old photos
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                  Repair fading, scratches, and low contrast before generating motion.
                </p>
              </Link>
              <Link
                href="/colorize-old-photos"
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
              >
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Colorize old photos
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                  Add estimated color to a clean scan before creating the video.
                </p>
              </Link>
              {relatedPages.map((relatedPage) => (
                <Link
                  key={relatedPage.slug}
                  href={relatedPage.path}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
                >
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {relatedPage.cardTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {relatedPage.cardDescription}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
