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
