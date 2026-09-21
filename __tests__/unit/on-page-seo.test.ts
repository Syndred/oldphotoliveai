import fs from "node:fs";
import path from "node:path";
import messages from "@/../messages/en.json";
import { HOME_SEO_CONTENT } from "@/content/home-seo";
import { ANIMATE_HOW_IT_WORKS } from "@/content/home-animation";
import { getAnimationLandingPage } from "@/content/animation-landing-pages";
import { getToolPage } from "@/content/tool-pages";

const projectFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("five-page on-page SEO contracts", () => {
  it("places photo colorization in the homepage H1 and opening body sentence", () => {
    expect(messages.landing.hero.title).toBe("Photo Colorization with AI");
    expect(HOME_SEO_CONTENT.en.contentParagraphs[0]).toMatch(
      /^Photo colorization\b/
    );
  });

  it("gives the colorizer an exact H1, headings, comparison image, and format table", () => {
    const colorizer = getToolPage("en", "colorize-old-photos");
    const component = projectFile("src/components/tool/ToolLandingPage.tsx");

    expect(colorizer.heroTitle).toBe(
      "Colorize Old Photos with AI — Free Online Photo Colorizer"
    );
    expect(colorizer.heroDescription).toMatch(/^Colorize old photos\b/);
    expect(colorizer.benefitsTitle).toBe("How to Colorize Old Photos");
    expect(colorizer.showcaseTitle).toBe("Before & After Examples");
    expect(component).toContain("<BeforeAfterCompare");
    expect(component).toContain("colorize old photos");
    expect(component).toContain("<table");
    expect(component).toContain('format: "JPG / JPEG"');
    expect(component).toContain('format: "PNG"');
    expect(component).toContain('format: "WEBP"');
  });

  it("keeps the animate page demonstrable and answers the three target questions", () => {
    const animate = getAnimationLandingPage("animate");
    const questions = animate.faqs.map((item) => item.question.toLowerCase());
    const component = projectFile("src/components/AnimationLandingPage.tsx");

    expect(ANIMATE_HOW_IT_WORKS.title).toBe("How It Works");
    expect(component).toContain("<VideoShowcaseSection");
    expect(component).toContain("Supported Photo Formats");
    expect(questions.some((question) => question.includes("animate old photos"))).toBe(true);
    expect(questions.some((question) => question.includes("bring old photos to life"))).toBe(true);
    expect(questions.some((question) => question.includes("make old photos move"))).toBe(true);
  });

  it("adds restoration variants and the requested before-and-after H2", () => {
    const restoration = getToolPage("en", "restore-old-photos");
    const body = [
      restoration.introBody,
      ...(restoration.guideSections ?? []).map((section) => section.body),
    ].join(" ").toLowerCase();

    expect(restoration.showcaseTitle).toBe(
      "Before & After: Restore Old Photos"
    );
    expect(body).toContain("old photo restoration");
    expect(body).toContain("photo restoration");
    expect(body).toContain("restore photos");
  });

  it("keeps a real repair comparison and adds the requested damage H2", () => {
    const repair = getToolPage("en", "repair-damaged-old-photos");
    const showcase = projectFile("src/app/sections/ShowcaseSection.tsx");

    expect(repair.benefitsTitle).toBe("Types of Damage We Repair");
    expect(repair.showcaseTitle).toBe(
      "Before & After: Repair Damaged Old Photos"
    );
    expect(repair.showcaseKind).toBe("restoration");
    expect(showcase).toContain("<BeforeAfterCompare");
    expect(showcase).toContain("Damaged old family photo before AI restoration");
  });
});
