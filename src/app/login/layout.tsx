import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to OldPhotoLive AI to restore, colorize, and animate your old photos.",
  openGraph: {
    title: "Sign In",
    description:
      "Sign in to OldPhotoLive AI to restore, colorize, and animate your old photos.",
    url: "https://oldphotolive.com/login",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In",
    description:
      "Sign in to OldPhotoLive AI to restore, colorize, and animate your old photos.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
