import type { Metadata } from "next";
import NoLoginToolPage from "@/components/NoLoginToolPage";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface LocalizedNoLoginPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedNoLoginPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;

  return buildLocalizedPageMetadata({
    locale,
    title:
      "Old Photo to Video AI Free Without Login — No Sign Up | OldPhotoLiveAI",
    description:
      "Turn old photos into videos with AI free without login. No sign-up needed. Animate your memories instantly online. Start now.",
    path: "/no-login",
    keywords: [
      "old photo to video AI free without login",
      "old photo animation no sign up",
      "animate old photos online free",
    ],
  });
}

export default function LocalizedNoLoginPage({
  params,
}: LocalizedNoLoginPageProps) {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <NoLoginToolPage locale={locale} />;
}
