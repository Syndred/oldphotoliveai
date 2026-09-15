import type { Metadata } from "next";
import ToolLandingPage from "@/components/tool/ToolLandingPage";
import { getToolPage } from "@/content/tool-pages";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedToolPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: LocalizedToolPageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const page = getToolPage(locale, "repair-damaged-old-photos");

  return buildLocalizedPageMetadata({
    locale,
    title: page.title,
    description: page.description,
    path: "/repair-damaged-old-photos",
    keywords: page.keywords,
  });
}

export default async function LocalizedRepairDamagedOldPhotosPage(props: LocalizedToolPageProps) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <ToolLandingPage locale={locale} slug="repair-damaged-old-photos" />;
}
