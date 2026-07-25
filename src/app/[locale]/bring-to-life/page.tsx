import type { Metadata } from "next";
import AnimationLandingPage from "@/components/AnimationLandingPage";
import { getAnimationLandingPage } from "@/content/animation-landing-pages";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { absoluteLocalizedUrl, buildLocalizedPageMetadata } from "@/lib/seo";

interface PageProps {
  params: { locale: string };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const page = getAnimationLandingPage("bring-to-life");

  const metadata = buildLocalizedPageMetadata({
    locale,
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: page.keywords,
    robots: locale === "en" ? undefined : { index: false, follow: true },
  });

  return {
    ...metadata,
    title: { absolute: page.title },
    alternates: {
      canonical: `/en${page.path}`,
      languages: {
        en: absoluteLocalizedUrl("en", page.path),
        "x-default": absoluteLocalizedUrl("en", page.path),
      },
    },
  };
}

export default function BringToLifePage({ params }: PageProps) {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <AnimationLandingPage locale={locale} slug="bring-to-life" />;
}
