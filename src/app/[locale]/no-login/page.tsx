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
    robots: { index: false, follow: true },
  });

  return {
    ...metadata,
    title: {
      absolute:
        "Old Photo to Video AI Free Without Login - No Sign Up | OldPhotoLiveAI",
    },
  };
}

export default async function LocalizedNoLoginPage(props: LocalizedNoLoginPageProps) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  return <NoLoginToolPage locale={locale} />;
}
