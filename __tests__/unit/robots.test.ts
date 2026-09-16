import robots from "@/app/robots";

describe("robots.txt", () => {
  it("allows crawlers to reach localized noindex pages", () => {
    const rules = robots().rules;
    const serialized = JSON.stringify(rules);

    expect(serialized).not.toContain("/zh/");
    expect(serialized).not.toContain("/es/");
    expect(serialized).not.toContain("/ja/");
    expect(serialized).toContain("/api/");
    expect(serialized).toContain("/admin");
  });
});
