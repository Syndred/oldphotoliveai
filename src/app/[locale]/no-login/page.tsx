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
    title: "No-Login Photo Animation Preview | OldPhotoLive AI",
    description:
      "Try one watermarked 480p old-photo animation preview without an account, then sign in only if you want saved history or higher-quality exports.",
    path: "/no-login",
  });

  return {
    ...metadata,
    title: {
      absolute: "No-Login Photo Animation Preview | OldPhotoLive AI",
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
