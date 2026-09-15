import type { Metadata } from "next";
import ToolLandingPage from "@/components/tool/ToolLandingPage";
import { getToolPage, getToolPagePath } from "@/content/tool-pages";
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
  const page = getToolPage(locale, "colorize-old-photos");

  return buildLocalizedPageMetadata({
    locale,
    title: page.title,
    description: page.description,
    path: getToolPagePath("colorize-old-photos"),
    keywords: page.keywords,
  });
}

export default async function LocalizedColorizePage(props: LocalizedToolPageProps) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <ToolLandingPage locale={locale} slug="colorize-old-photos" />;
}
