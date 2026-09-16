import { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const INDEXABLE_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/animate", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/bring-to-life", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date("2026-09-16T00:00:00.000Z"),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
