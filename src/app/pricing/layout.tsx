import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO_COPY } from "@/content/page-seo";

const pricingSeo = PAGE_SEO_COPY.en.pricing;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: pricingSeo.title,
    description: pricingSeo.description,
    path: "/pricing",
    keywords: [
      "ai photo restoration pricing",
      "old photo restoration online pricing",
      "restore old photos online",
      "photo restoration cost",
    ],
  }),
  title: { absolute: pricingSeo.title },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
