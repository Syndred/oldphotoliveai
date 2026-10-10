import type { Metadata } from "next";
import PricingPage from "@/app/pricing/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedPricingPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: LocalizedPricingPageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].pricing;

  const metadata = buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/pricing",
    keywords: [
      "ai photo restoration pricing",
      "old photo restoration online pricing",
      "restore old photos online",
      "photo restoration cost",
    ],
  });
  return { ...metadata, title: { absolute: seo.title } };
}

export default function LocalizedPricingPage() {
  return <PricingPage />;
}
