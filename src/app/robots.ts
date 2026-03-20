import { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const localizedAdminPaths = locales.map((locale) => `/${locale}/admin`);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", ...localizedAdminPaths],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
