import { MetadataRoute } from "next";
import { getBlogPosts } from "@/content/blog";
import { TOOL_PAGE_SLUGS, getToolPagePath } from "@/content/tool-pages";
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
      path: "/about",
      lastModified: new Date("2026-04-01T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      path: "/pricing",
      lastModified: new Date("2026-03-18T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      path: "/blog",
      lastModified: new Date("2026-07-22T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: "/no-login",
      lastModified: new Date("2026-07-23T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 0.95,
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
    path: getToolPagePath(slug),
    lastModified: new Date("2026-03-18T00:00:00.000Z"),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const blogRoutes = getBlogPosts("en").map((post) => ({
    path: `/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const allRoutes = [...staticRoutes, ...toolRoutes, ...blogRoutes];

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
