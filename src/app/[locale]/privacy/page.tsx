import type { Metadata } from "next";
import PrivacyPolicyPage from "@/app/privacy/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedPrivacyPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedPrivacyPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].privacy;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/privacy",
  });
}

export default function LocalizedPrivacyPage() {
  return <PrivacyPolicyPage />;
}
