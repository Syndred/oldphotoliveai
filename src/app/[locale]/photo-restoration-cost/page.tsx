import type { Metadata } from "next";
import PhotoRestorationCostPage from "@/components/PhotoRestorationCostPage";
import { PHOTO_RESTORATION_COST as content } from "@/content/photo-restoration-cost";
import { buildLocalizedPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return buildLocalizedPageMetadata({
    locale: "en",
    path: content.path,
    title: content.title,
    description: content.description,
    keywords: [...content.keywords],
    type: "article",
    section: "AI photo restoration",
  });
}

export default function CostPage() {
  return <PhotoRestorationCostPage />;
}
