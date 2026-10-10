import type { Metadata } from "next";
import NoLoginToolPage from "@/components/NoLoginToolPage";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedNoLoginPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata(props: LocalizedNoLoginPageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;

  const metadata = buildLocalizedPageMetadata({
    locale,
    title: "Upload an Old Photo Before Login | OldPhotoLive AI",
    description:
      "Upload your photo first, then sign in and pay $1.99 before AI animation begins. Get a complete result without a watermark or subscription.",
    path: "/no-login",
    robots: { index: false, follow: true },
  });

  return {
    ...metadata,
    title: {
      absolute: "Upload an Old Photo Before Login | OldPhotoLive AI",
    },
    alternates: {
      canonical: "https://oldphotoliveai.com/no-login",
      languages: {
        en: "https://oldphotoliveai.com/no-login",
        "x-default": "https://oldphotoliveai.com/no-login",
      },
    },
  };
}

export default async function LocalizedNoLoginPage(props: LocalizedNoLoginPageProps) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <NoLoginToolPage locale={locale} />;
}
