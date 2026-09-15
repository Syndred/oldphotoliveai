import type { Metadata } from "next";
import AnimationLandingPage from "@/components/AnimationLandingPage";
import { getAnimationLandingPage } from "@/content/animation-landing-pages";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { absoluteLocalizedUrl, buildLocalizedPageMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const page = getAnimationLandingPage("to-video");

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
      canonical: absoluteLocalizedUrl("en", page.path),
      languages: {
        en: absoluteLocalizedUrl("en", page.path),
        "x-default": absoluteLocalizedUrl("en", page.path),
      },
    },
  };
}

export default async function ToVideoPage(props: PageProps) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <AnimationLandingPage locale={locale} slug="to-video" />;
}
