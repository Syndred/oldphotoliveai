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
import {
  BRAND_NAME,
  SITE_DESCRIPTION,
  SITE_URL,
} from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";
import { defaultLocale, type Locale } from "@/i18n/routing";

interface HomePageViewProps {
  locale?: Locale;
}

export default function HomePageView({
  locale = defaultLocale,
}: HomePageViewProps) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
      email: "support@oldphotoliveai.com",
      logo: absoluteUrl("/opengraph-image"),
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
      "@type": "SoftwareApplication",
      name: BRAND_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
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
        <HeroSection>
          <UploadSection
            variant="embedded"
            showHeader={false}
            analyticsSource="home_hero"
            className="mt-8 max-w-4xl"
          />
        </HeroSection>
        <ShowcaseSection />
        <VideoShowcaseSection />
        <FeaturesSection />
        <ToolCardsSection locale={locale} />
        <HowItWorksSection />
        <FAQSection />
      </main>

      <FooterSection />
    </div>
  );
}
