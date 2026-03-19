import { Metadata } from "next";
import HomePageView from "@/components/HomePageView";
import { buildPageMetadata } from "@/lib/seo";
import { defaultLocale } from "@/i18n/routing";

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
  return <HomePageView locale={defaultLocale} />;
}
