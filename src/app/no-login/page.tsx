import type { Metadata } from "next";
import NoLoginToolPage from "@/components/NoLoginToolPage";
import { defaultLocale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

const noLoginMetadata = buildPageMetadata({
  title: "No-Login Photo Animation Preview | OldPhotoLive AI",
  description:
    "Try one watermarked 480p old-photo animation preview without an account, then sign in only if you want saved history or higher-quality exports.",
  path: "/no-login",
});

export const metadata: Metadata = {
  ...noLoginMetadata,
  title: {
    absolute: "No-Login Photo Animation Preview | OldPhotoLive AI",
  },
};

export default function NoLoginPage() {
  return <NoLoginToolPage locale={defaultLocale} />;
}
