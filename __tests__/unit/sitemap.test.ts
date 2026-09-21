import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes localized about pages", () => {
    const entries = sitemap();
    const aboutUrls = entries
      .map((entry) => entry.url)
      .filter((url) => /\/(?:zh\/|es\/|ja\/)?about$/.test(url));

    expect(aboutUrls).toEqual([
      "https://oldphotoliveai.com/about",
      "https://oldphotoliveai.com/zh/about",
      "https://oldphotoliveai.com/es/about",
      "https://oldphotoliveai.com/ja/about",
    ]);

    const enAbout = entries.find(
      (entry) => entry.url === "https://oldphotoliveai.com/about"
    );

    expect(enAbout?.alternates?.languages?.["x-default"]).toBe(
      "https://oldphotoliveai.com/about"
    );
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
