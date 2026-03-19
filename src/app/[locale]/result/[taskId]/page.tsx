import type { Metadata } from "next";
import ResultPage from "@/app/result/[taskId]/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import {
  PRIVATE_PAGE_ROBOTS,
  buildLocalizedPageMetadata,
} from "@/lib/seo";

interface LocalizedResultPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedResultPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].result;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/result",
    robots: PRIVATE_PAGE_ROBOTS,
  });
}

export default function LocalizedResultPage() {
  return <ResultPage />;
}
