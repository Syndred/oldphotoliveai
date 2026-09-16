import { buildLocalizedPageMetadata } from "@/lib/seo";

describe("localized page indexing", () => {
  it.each(["zh", "es", "ja"] as const)(
    "marks %s pages noindex, follow without hreflang alternates",
    (locale) => {
      const metadata = buildLocalizedPageMetadata({
        locale,
        title: "Localized page",
        description: "Localized page description",
        path: "/about",
      });

      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.languages).toBeUndefined();
    }
  );
});
