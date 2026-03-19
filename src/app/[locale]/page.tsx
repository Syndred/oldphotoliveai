import type { Metadata } from "next";
import HomePage from "@/app/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedHomePageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedHomePageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].home;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/",
    keywords: [
      "ai photo restoration",
      "restore old photos online",
      "old photo restoration ai",
      "photo colorization ai",
      "animate old photos",
    ],
  });
}

export default function LocalizedHomePage() {
  return <HomePage />;
}
