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

  it("includes localized no-login tool pages", () => {
    const entries = sitemap();
    const noLoginUrls = entries
      .map((entry) => entry.url)
      .filter((url) => /\/(?:zh\/|es\/|ja\/)?no-login$/.test(url));

    expect(noLoginUrls).toEqual([
      "https://oldphotoliveai.com/no-login",
      "https://oldphotoliveai.com/zh/no-login",
      "https://oldphotoliveai.com/es/no-login",
      "https://oldphotoliveai.com/ja/no-login",
    ]);
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
});
