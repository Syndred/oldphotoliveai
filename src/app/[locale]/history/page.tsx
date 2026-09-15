import type { Metadata } from "next";
import HistoryPage from "@/app/history/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import {
  PRIVATE_PAGE_ROBOTS,
  buildLocalizedPageMetadata,
} from "@/lib/seo";

interface LocalizedHistoryPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: LocalizedHistoryPageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].history;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/history",
    robots: PRIVATE_PAGE_ROBOTS,
  });
}

export default function LocalizedHistoryPage() {
  return <HistoryPage />;
}
