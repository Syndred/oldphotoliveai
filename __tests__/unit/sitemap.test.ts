import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes localized about pages", () => {
    const entries = sitemap();
    const aboutUrls = entries
      .map((entry) => entry.url)
      .filter((url) => /\/(en|zh|es|ja)\/about$/.test(url));

    expect(aboutUrls).toEqual([
      "https://oldphotoliveai.com/en/about",
      "https://oldphotoliveai.com/zh/about",
      "https://oldphotoliveai.com/es/about",
      "https://oldphotoliveai.com/ja/about",
    ]);

    const enAbout = entries.find(
      (entry) => entry.url === "https://oldphotoliveai.com/en/about"
    );

    expect(enAbout?.alternates?.languages?.["x-default"]).toBe(
      "https://oldphotoliveai.com/en/about"
    );
  });

  it("includes localized no-login tool pages", () => {
    const entries = sitemap();
    const noLoginUrls = entries
      .map((entry) => entry.url)
      .filter((url) => /\/(en|zh|es|ja)\/no-login$/.test(url));

    expect(noLoginUrls).toEqual([
      "https://oldphotoliveai.com/en/no-login",
      "https://oldphotoliveai.com/zh/no-login",
      "https://oldphotoliveai.com/es/no-login",
      "https://oldphotoliveai.com/ja/no-login",
    ]);
  });
});
