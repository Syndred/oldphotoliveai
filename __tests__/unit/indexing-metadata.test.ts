import { buildLocalizedPageMetadata } from "@/lib/seo";

describe("localized page indexing", () => {
  it.each(["zh", "es", "ja"] as const)(
    "excludes redirected translations from the %s metadata cluster",
    (locale) => {
      const metadata = buildLocalizedPageMetadata({
        locale,
        title: "Localized page",
        description: "Localized page description",
        path: "/about",
      });

      expect(metadata.robots).toBeUndefined();
      expect(metadata.alternates?.languages).toMatchObject({
        en: "https://oldphotoliveai.com/about",
        "x-default": "https://oldphotoliveai.com/about",
      });
    }
  );
});
