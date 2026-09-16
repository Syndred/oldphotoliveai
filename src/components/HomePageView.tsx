import Navbar from "@/components/Navbar";
import HomeAnimationHero from "@/app/sections/HomeAnimationHero";
import HomeTransformationSection from "@/app/sections/HomeTransformationSection";
import HomeUseCasesSection from "@/app/sections/HomeUseCasesSection";
import HowItWorksSection from "@/app/sections/HowItWorksSection";
import FAQSection from "@/app/sections/FAQSection";
import FooterSection from "@/app/sections/FooterSection";
import { BRAND_NAME, BRAND_ICON, SITE_URL } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";
import { HOME_ANIMATION_FAQS, HOME_HOW_IT_WORKS, HOME_METADATA } from "@/content/home-animation";
import { SHOWCASE_SAMPLE_ASSETS } from "@/config/showcase-assets";
import { resolveShowcaseAssetUrl } from "@/config/showcase";
import type { Locale } from "@/i18n/routing";

export default function HomePageView({ locale = "en" }: { locale?: Locale } = {}) {
  const demo = SHOWCASE_SAMPLE_ASSETS[0];
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
      "@type": "WebApplication",
      name: "OldPhotoLive AI",
      description: HOME_METADATA.description,
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: ["Restore old photos", "Colorize black and white photos", "Animate old portraits"],
    },
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Bring Old Photos to Life — AI Animation Demo",
      description: "Watch AI restore, colorize, and animate an old family photo.",
      thumbnailUrl: resolveShowcaseAssetUrl(demo.colorizedKey),
      contentUrl: resolveShowcaseAssetUrl(demo.animationKey),
      uploadDate: "2026-09-16",
    },
  ];

  return (
    <div data-locale={locale} className="min-h-screen bg-[var(--color-primary-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main>
        <HomeAnimationHero />
        <HowItWorksSection copy={HOME_HOW_IT_WORKS} />
        <HomeTransformationSection />
        <HomeUseCasesSection />
        <FAQSection title="Frequently Asked Questions" items={[...HOME_ANIMATION_FAQS]} />
      </main>
      <FooterSection />
    </div>
  );
}
