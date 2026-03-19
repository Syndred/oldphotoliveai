import { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign In",
  description:
    "Sign in to OldPhotoLive AI to restore, colorize, and animate your old photos.",
  path: "/login",
  robots: PRIVATE_PAGE_ROBOTS,
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
