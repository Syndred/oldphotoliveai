import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Upload your photo, sign in, and pay $1.99 before processing with your selected tool. The complete paid-quality result has no watermark. No subscription is required.",
  path: "/pricing",
  keywords: [
    "ai photo restoration pricing",
    "old photo restoration online pricing",
    "restore old photos online",
  ],
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
