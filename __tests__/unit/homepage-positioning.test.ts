import {
  HOME_METADATA,
  HOME_ANIMATION_FAQS,
  HOME_PIPELINE_STEPS,
  HOME_USE_CASES,
} from "@/content/home-animation";
import { PAGE_SEO_COPY } from "@/content/page-seo";

describe("animate-focused homepage", () => {
  it("uses the approved homepage metadata", () => {
    expect(HOME_METADATA.title).toBe(
      "Animate Old Photos with AI — Restore, Colorize & Bring Old Photos to Life Online Free"
    );
    expect(HOME_METADATA.description).toBe(
      "Restore, colorize, and animate your old family photos with AI. Upload a vintage photo and watch it come to life in seconds. Free preview."
    );
    expect(HOME_METADATA.path).toBe("/");
    expect(PAGE_SEO_COPY.en.home.title).toBe(HOME_METADATA.title);
    expect(PAGE_SEO_COPY.en.home.description).toBe(HOME_METADATA.description);
  });

  it("defines the complete restore, colorize, animate pipeline", () => {
    expect(HOME_PIPELINE_STEPS.map((step) => step.title)).toEqual([
      "Restore",
      "Colorize",
      "Animate",
    ]);
    expect(HOME_PIPELINE_STEPS.map((step) => step.href)).toEqual([
      "/restore-old-photos",
      "/colorize-old-photos",
      "/animate",
    ]);
  });

  it("provides six use cases and ten factual FAQ entries", () => {
    expect(HOME_USE_CASES).toHaveLength(6);
    expect(HOME_ANIMATION_FAQS).toHaveLength(10);
    expect(HOME_ANIMATION_FAQS[7].answer).toContain("task history");
    expect(HOME_ANIMATION_FAQS[7].answer).not.toContain("deleted immediately");
  });
});
