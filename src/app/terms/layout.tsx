import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms and conditions for using OldPhotoLive AI services.",
  openGraph: {
    title: "Terms of Service",
    description:
      "The terms and conditions for using OldPhotoLive AI services.",
    url: "https://oldphotoliveai.com/terms",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service",
    description:
      "The terms and conditions for using OldPhotoLive AI services.",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
