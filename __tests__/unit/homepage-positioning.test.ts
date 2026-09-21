import { HOME_SEO_CONTENT } from "@/content/home-seo";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import messages from "@/../messages/en.json";

describe("colorizer-focused homepage", () => {
  it("owns the broad photo-colorization query", () => {
    expect(PAGE_SEO_COPY.en.home.title).toBe(
      "Colorize Photo Online Free – AI Photo Colorizer"
    );
    expect(messages.landing.hero.title).toBe("Photo Colorization with AI");
    expect(PAGE_SEO_COPY.en.home.description).toContain("daily free account quota");
  });

  it("links colorization to the adjacent restoration and animation tools", () => {
    const content = HOME_SEO_CONTENT.en;
    expect(content.colorizeCta).toBe("Colorize B&W photos");
    expect(content.restoreCta).toBe("Restore old photos");
    expect(content.animateCta).toBe("Animate portraits");
    expect(content.contentTitle).toMatch(/Colorize black-and-white photos/i);
  });

  it("provides factual colorization FAQs", () => {
    expect(HOME_SEO_CONTENT.en.faqItems).toHaveLength(8);
    expect(HOME_SEO_CONTENT.en.faqItems[0].answer).toContain("daily free quota");
    expect(HOME_SEO_CONTENT.en.faqItems[1].answer).toContain("estimate plausible colors");
  });
});
