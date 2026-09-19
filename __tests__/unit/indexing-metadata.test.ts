import { buildLocalizedPageMetadata } from "@/lib/seo";

describe("localized page indexing", () => {
  it.each(["zh", "es", "ja"] as const)(
    "keeps %s pages in the shared hreflang cluster",
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
        "zh-Hans": "https://oldphotoliveai.com/zh/about",
        es: "https://oldphotoliveai.com/es/about",
        ja: "https://oldphotoliveai.com/ja/about",
        "x-default": "https://oldphotoliveai.com/about",
      });
    }
  );
});
