import { Metadata } from "next";
import HomePageView from "@/components/HomePageView";
import { buildPageMetadata } from "@/lib/seo";
import { HOME_METADATA } from "@/content/home-animation";

export const metadata: Metadata = {
  ...buildPageMetadata({
    ...HOME_METADATA,
    keywords: [
      "animate old photos",
      "bring old photos to life",
      "restore colorize animate old photos",
    ],
  }),
  title: { absolute: HOME_METADATA.title },
};

export default function HomePage() {
  return <HomePageView />;
}
