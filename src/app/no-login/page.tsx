import type { Metadata } from "next";
import NoLoginToolPage from "@/components/NoLoginToolPage";
import { defaultLocale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

const noLoginMetadata = buildPageMetadata({
  title: "Upload Before Login — Photo Animation | OldPhotoLive AI",
  description:
    "Upload your photo, sign in, and pay $1.99 before processing with your selected tool. The complete paid-quality result has no watermark. No subscription is required.",
  path: "/no-login",
  robots: { index: false, follow: true },
});

export const metadata: Metadata = {
  ...noLoginMetadata,
  title: {
    absolute: "Upload Before Login — Photo Animation | OldPhotoLive AI",
  },
};

export default function NoLoginPage() {
  return <NoLoginToolPage locale={defaultLocale} />;
}
