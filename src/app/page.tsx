import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import HeroSection from "./sections/HeroSection";
import ShowcaseSection from "./sections/ShowcaseSection";
import FeaturesSection from "./sections/FeaturesSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import UploadSection from "./sections/UploadSection";
import FAQSection from "./sections/FAQSection";
import FooterSection from "./sections/FooterSection";

export const metadata: Metadata = {
  title: "AI Photo Restoration & Colorization",
  description:
    "Restore, colorize, and animate your old photos with AI — bring faded memories back to life in seconds.",
  openGraph: {
    title: "AI Photo Restoration & Colorization",
    description:
      "Restore, colorize, and animate your old photos with AI — bring faded memories back to life in seconds.",
    url: "https://oldphotolive.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Photo Restoration & Colorization",
    description:
      "Restore, colorize, and animate your old photos with AI — bring faded memories back to life in seconds.",
  },
};
export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "OldPhotoLive AI",
    description:
      "AI-powered photo restoration, colorization, and animation",
    url: "https://oldphotolive.com",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

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
        <FeaturesSection />
        <HowItWorksSection />
        <UploadSection />
        <FAQSection />
      </main>

      <FooterSection />
    </div>
  );
}
