import type { Metadata } from "next";
import ToolLandingPage from "@/components/tool/ToolLandingPage";
import { getToolPage } from "@/content/tool-pages";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedToolPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedToolPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const page = getToolPage("animate-old-photos");

  return buildLocalizedPageMetadata({
    locale,
    title: page.title,
    description: page.description,
    path: "/animate-old-photos",
    keywords: page.keywords,
  });
}

export default function LocalizedAnimateOldPhotosPage({
  params,
}: LocalizedToolPageProps) {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <ToolLandingPage locale={locale} slug="animate-old-photos" />;
}
