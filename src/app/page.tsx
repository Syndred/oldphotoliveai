import { Metadata } from "next";
import HomePageView from "@/components/HomePageView";
import { buildPageMetadata } from "@/lib/seo";
import { defaultLocale } from "@/i18n/routing";
import { PAGE_SEO_COPY } from "@/content/page-seo";

const homeSeo = PAGE_SEO_COPY[defaultLocale].home;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: homeSeo.title,
    description: homeSeo.description,
    path: "/",
    keywords: [
      "colorize photo",
      "colorize black and white photos",
      "photo colorizer",
      "colorize photos",
      "AI photo colorizer",
      "photo colorization",
    ],
  }),
  title: { absolute: homeSeo.title },
};

export default function HomePage() {
  return <HomePageView locale={defaultLocale} />;
}
