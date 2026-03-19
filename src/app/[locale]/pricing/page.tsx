import type { Metadata } from "next";
import PricingPage from "@/app/pricing/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedPricingPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedPricingPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].pricing;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/pricing",
    keywords: [
      "ai photo restoration pricing",
      "old photo restoration online pricing",
      "restore old photos online",
    ],
  });
}

export default function LocalizedPricingPage() {
  return <PricingPage />;
}
