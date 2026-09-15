import type { Metadata } from "next";
import TermsOfServicePage from "@/app/terms/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedTermsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: LocalizedTermsPageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].terms;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/terms",
  });
}

export default function LocalizedTermsPage() {
  return <TermsOfServicePage />;
}
