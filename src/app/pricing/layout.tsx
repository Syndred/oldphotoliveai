import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Preview AI photo restoration, colorization, and animation for free. Unlock the same result for $1.99 or use credits. Optional HD regeneration is separate.",
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
