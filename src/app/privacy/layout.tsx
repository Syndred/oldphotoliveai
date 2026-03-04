import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How OldPhotoLive AI collects, uses, and protects your personal data.",
  openGraph: {
    title: "Privacy Policy",
    description:
      "How OldPhotoLive AI collects, uses, and protects your personal data.",
    url: "https://oldphotoliveai.com/privacy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy",
    description:
      "How OldPhotoLive AI collects, uses, and protects your personal data.",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
