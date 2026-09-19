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

  it("keeps the English-only no-login page out of localized sitemap entries", () => {
    const entries = sitemap();
    const noLoginUrls = entries
      .map((entry) => entry.url)
      .filter((url) => /\/(?:zh\/|es\/|ja\/)?no-login$/.test(url));

    expect(noLoginUrls).toEqual(["https://oldphotoliveai.com/no-login"]);

    const noLogin = entries.find(
      (entry) => entry.url === "https://oldphotoliveai.com/no-login"
    );
    expect(noLogin?.alternates?.languages).toEqual({
      en: "https://oldphotoliveai.com/no-login",
      "x-default": "https://oldphotoliveai.com/no-login",
    });
  });

  it("includes the four English animation search landing pages", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://oldphotoliveai.com/animate-free",
        "https://oldphotoliveai.com/bring-to-life",
        "https://oldphotoliveai.com/to-video",
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
