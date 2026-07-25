import type { Metadata } from "next";
import NoLoginToolPage from "@/components/NoLoginToolPage";
import { defaultLocale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

const noLoginMetadata = buildPageMetadata({
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

export const metadata: Metadata = {
  ...noLoginMetadata,
  title: {
    absolute:
      "Old Photo to Video AI Free Without Login - No Sign Up | OldPhotoLiveAI",
  },
};

export default function NoLoginPage() {
  return <NoLoginToolPage locale={defaultLocale} />;
}
