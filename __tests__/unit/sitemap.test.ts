import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("publishes only the approved English indexable routes", () => {
    const entries = sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://oldphotoliveai.com/",
      "https://oldphotoliveai.com/animate",
      "https://oldphotoliveai.com/bring-to-life",
      "https://oldphotoliveai.com/pricing",
      "https://oldphotoliveai.com/about",
    ]);
    expect(entries[0]).toMatchObject({ changeFrequency: "weekly", priority: 1 });
    expect(entries.every((entry) => entry.alternates === undefined)).toBe(true);
  });
});
