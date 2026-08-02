import Navbar from "@/components/Navbar";
import HeroSection from "@/app/sections/HeroSection";
import ShowcaseSection from "@/app/sections/ShowcaseSection";
import VideoShowcaseSection from "@/app/sections/VideoShowcaseSection";
import FeaturesSection from "@/app/sections/FeaturesSection";
import HowItWorksSection from "@/app/sections/HowItWorksSection";
import UploadSection from "@/app/sections/UploadSection";
import FAQSection from "@/app/sections/FAQSection";
import FooterSection from "@/app/sections/FooterSection";
import ToolCardsSection from "@/components/tool/ToolCardsSection";
import AnimationRelatedToolsSection from "@/components/AnimationRelatedToolsSection";
import {
  BRAND_NAME,
  BRAND_ICON,
  SITE_DESCRIPTION,
  SITE_URL,
} from "@/lib/site";
import { absoluteUrl, buildFaqJsonLd } from "@/lib/seo";
import { defaultLocale, type Locale } from "@/i18n/routing";
import { HOME_SEO_CONTENT } from "@/content/home-seo";
import { Link } from "@/i18n/navigation";

interface HomePageViewProps {
  locale?: Locale;
}

const HOME_TOOL_NAV_LINKS = [
  { href: "/", label: "Animate Photos" },
  { href: "/no-login", label: "No Login" },
  { href: "/animate-free", label: "Free Animation" },
  { href: "/bring-to-life", label: "Bring to Life" },
  { href: "/to-video", label: "Photo to Video" },
] as const;

export default function HomePageView({
  locale = defaultLocale,
}: HomePageViewProps) {
  const homeSeo = HOME_SEO_CONTENT[locale] ?? HOME_SEO_CONTENT.en;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
      email: "support@oldphotoliveai.com",
      logo: absoluteUrl(BRAND_ICON),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: BRAND_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: BRAND_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0.00",
        priceCurrency: "USD",
      },
      featureList: [
        "Restore old photos online",
        "Colorize black and white photos",
        "Animate old photos",
        "Convert old photos to AI videos",
      ],
    },
    buildFaqJsonLd(homeSeo.faqItems),
  ];

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main>
        <HeroSection>
          <UploadSection
            variant="embedded"
            showHeader={false}
            analyticsSource="home_hero"
            className="mt-8 max-w-4xl"
          />
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/colorize"
              className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
            >
              {homeSeo.colorizeCta}
            </Link>
            <Link
              href="/restore"
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-black/10 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
            >
              {homeSeo.restoreCta}
            </Link>
            <Link
              href="/animate"
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-black/10 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
            >
              {homeSeo.animateCta}
            </Link>
            <Link
              href="/repair-damaged-old-photos"
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-black/10 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
            >
              {homeSeo.repairCta}
            </Link>
          </div>
          <nav
            aria-label="OldPhotoLiveAI tool navigation"
            className="mt-5 flex flex-wrap justify-center gap-2"
          >
            {HOME_TOOL_NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-[40px] items-center rounded-full border border-white/12 bg-black/10 px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05] hover:text-white sm:text-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </HeroSection>
        <ToolCardsSection locale={locale} />
        {locale === "en" ? <AnimationRelatedToolsSection /> : null}
        <ShowcaseSection />
        <VideoShowcaseSection />
        <FeaturesSection />
        <section className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              {homeSeo.contentEyebrow}
            </p>
            <h2 className="mt-3 max-w-4xl text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
              {homeSeo.contentTitle}
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
              {homeSeo.contentParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/colorize"
                className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
              >
                {homeSeo.colorizeCta}
              </Link>
              <Link
                href="/restore"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {homeSeo.restoreCta}
              </Link>
            </div>
          </div>
        </section>
        <HowItWorksSection />
        <FAQSection items={homeSeo.faqItems} />
      </main>

      <FooterSection />
    </div>
  );
}
