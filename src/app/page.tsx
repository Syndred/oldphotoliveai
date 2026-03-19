import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import HeroSection from "./sections/HeroSection";
import ShowcaseSection from "./sections/ShowcaseSection";
import VideoShowcaseSection from "./sections/VideoShowcaseSection";
import FeaturesSection from "./sections/FeaturesSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import UploadSection from "./sections/UploadSection";
import FAQSection from "./sections/FAQSection";
import FooterSection from "./sections/FooterSection";
import ToolCardsSection from "@/components/tool/ToolCardsSection";
import {
  BRAND_NAME,
  SITE_DESCRIPTION,
  SITE_URL,
} from "@/lib/site";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Photo Restoration & Colorization",
  description:
    "Restore, colorize, and animate your old photos with AI. Upload faded family photos, repair damage, and bring memories back to life in seconds.",
  path: "/",
  keywords: [
    "ai photo restoration",
    "restore old photos online",
    "old photo restoration ai",
    "photo colorization ai",
    "animate old photos",
  ],
});

export default function HomePage() {
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
        <HeroSection />
        <ShowcaseSection />
        <VideoShowcaseSection />
        <FeaturesSection />
        <ToolCardsSection />
        <HowItWorksSection />
        <UploadSection />
        <FAQSection />
      </main>

      <FooterSection />
    </div>
  );
}
