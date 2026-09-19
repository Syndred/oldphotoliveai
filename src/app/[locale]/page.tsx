import type { Metadata } from "next";
import HomePageView from "@/components/HomePageView";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedHomePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: LocalizedHomePageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].home;

  const metadata = buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/",
    keywords: [
      "colorize photo",
      "colorize black and white photos",
      "photo colorizer",
      "colorize photos",
      "AI photo colorizer",
      "photo colorization",
    ],
  });

  return { ...metadata, title: { absolute: seo.title } };
}

export default async function LocalizedHomePage(props: LocalizedHomePageProps) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <HomePageView locale={locale} />;
}
