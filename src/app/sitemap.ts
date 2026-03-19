import { MetadataRoute } from "next";
import { TOOL_PAGE_SLUGS } from "@/content/tool-pages";
import { locales, type Locale } from "@/i18n/routing";
import {
  absoluteLocalizedUrl,
  buildLanguageAlternates,
} from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    {
      path: "/",
      lastModified: new Date("2026-03-18T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      path: "/pricing",
      lastModified: new Date("2026-03-18T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      path: "/privacy",
      lastModified: new Date("2026-03-14T00:00:00.000Z"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      path: "/terms",
      lastModified: new Date("2026-03-16T00:00:00.000Z"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ] as const;

  const toolRoutes = TOOL_PAGE_SLUGS.map((slug) => ({
    path: `/${slug}`,
    lastModified: new Date("2026-03-18T00:00:00.000Z"),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const allRoutes = [...staticRoutes, ...toolRoutes];

  return locales.flatMap((locale) =>
    allRoutes.map((route) => ({
      url: absoluteLocalizedUrl(locale as Locale, route.path),
      lastModified: route.lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: buildLanguageAlternates(route.path),
      },
    }))
  );
}
