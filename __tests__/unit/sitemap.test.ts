import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("publishes only English content plus the three maintained Chinese pages", () => {
    const entries = sitemap();
    const chineseUrls = entries.map(entry => entry.url).filter(url => url.includes("/zh"));
    expect(chineseUrls.sort()).toEqual([
      "https://oldphotoliveai.com/zh",
      "https://oldphotoliveai.com/zh/colorize-old-photos",
      "https://oldphotoliveai.com/zh/pricing",
    ].sort());
    expect(entries.some(entry => /\/(es|ja|en)(?:\/|$)/.test(new URL(entry.url).pathname))).toBe(false);
    const about = entries.find(entry => entry.url === "https://oldphotoliveai.com/about");
    expect(about?.alternates?.languages).toEqual({
      en: "https://oldphotoliveai.com/about",
      "x-default": "https://oldphotoliveai.com/about",
    });
  });

  it("adds the English restoration cost guide without redirected language alternates", () => {
    const cost = sitemap().find(entry => entry.url.endsWith("/photo-restoration-cost"));
    expect(cost?.alternates?.languages).toEqual({
      en: "https://oldphotoliveai.com/photo-restoration-cost",
      "x-default": "https://oldphotoliveai.com/photo-restoration-cost",
    });
  });

  it("excludes noindex utility pages", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).not.toEqual(
      expect.arrayContaining([
        "https://oldphotoliveai.com/no-login",
        "https://oldphotoliveai.com/animate-free",
        "https://oldphotoliveai.com/to-video",
      ])
    );
  });

  it("includes only the indexable English animation pages", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://oldphotoliveai.com/bring-to-life",
        "https://oldphotoliveai.com/animate",
      ])
    );

    expect(urls).not.toEqual(
      expect.arrayContaining([
        "https://oldphotoliveai.com/zh/animate-free",
        "https://oldphotoliveai.com/es/bring-to-life",
        "https://oldphotoliveai.com/ja/to-video",
      ])
    );
  });

  it("contains only final indexable tool URLs without duplicates", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://oldphotoliveai.com/restore-old-photos");
    expect(urls).toContain("https://oldphotoliveai.com/colorize-old-photos");
    expect(urls).toContain("https://oldphotoliveai.com/animate");
    expect(urls).not.toContain("https://oldphotoliveai.com/restore");
    expect(urls).not.toContain("https://oldphotoliveai.com/animate-old-photos");
    expect(urls).not.toContain(
      "https://oldphotoliveai.com/repair-damaged-old-photos"
    );
    expect(urls.some((url) => /\/en(?:\/|$)/.test(url))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
