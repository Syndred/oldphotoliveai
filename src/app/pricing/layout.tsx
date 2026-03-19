import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Choose the right plan for AI photo restoration, colorization, and animation. Start free or upgrade for watermark-free exports and higher output quality.",
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
