jest.mock("@/components/HomePageView", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/tool/ToolLandingPage", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/NoLoginToolPage", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/AnimationLandingPage", () => ({
  __esModule: true,
  default: () => null,
}));

import robots from "@/app/robots";
import { generateMetadata as homeMetadata } from "@/app/[locale]/page";
import { generateMetadata as restoreMetadata } from "@/app/[locale]/restore-old-photos/page";
import { generateMetadata as repairMetadata } from "@/app/[locale]/repair-damaged-old-photos/page";
import { generateMetadata as noLoginMetadata } from "@/app/[locale]/no-login/page";
import { generateMetadata as animateFreeMetadata } from "@/app/[locale]/animate-free/page";
import { generateMetadata as toVideoMetadata } from "@/app/[locale]/to-video/page";

describe("SEO metadata ownership", () => {
  it("assigns the broad colorizer term to the English homepage", async () => {
    const metadata = await homeMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(metadata.title).toEqual({
      absolute: "Colorize Photo Online Free – AI Photo Colorizer",
    });
    expect(metadata.description).toMatch(/daily free account quota/);
    expect(metadata.keywords).toContain("colorize photo");
    expect(metadata.keywords).not.toContain("colorize old photos");
  });

  it("keeps restoration self-canonical on the final long URL", async () => {
    const metadata = await restoreMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(metadata.alternates?.canonical).toBe("/restore-old-photos");
    expect(metadata.alternates?.languages?.en).toBe(
      "https://oldphotoliveai.com/restore-old-photos"
    );
  });

  it("keeps damaged-photo repair accessible but out of the index cluster", async () => {
    const metadata = await repairMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({
      canonical: "/repair-damaged-old-photos",
    });
  });

  it("treats the no-login experience as one English utility page", async () => {
    const metadata = await noLoginMetadata({
      params: Promise.resolve({ locale: "zh" }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://oldphotoliveai.com/no-login"
    );
    expect(metadata.alternates?.languages).toEqual({
      en: "https://oldphotoliveai.com/no-login",
      "x-default": "https://oldphotoliveai.com/no-login",
    });
    expect(metadata.keywords).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it.each([
    ["/animate-free", animateFreeMetadata],
    ["/to-video", toVideoMetadata],
  ] as const)("keeps %s accessible but noindex", async (_path, generateMetadata) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("does not block legacy English or Spanish URLs in robots", () => {
    const rules = robots().rules;
    const serialized = JSON.stringify(rules);

    expect(serialized).not.toContain('"/en"');
    expect(serialized).not.toContain('"/en/"');
    expect(serialized).not.toContain('"/es"');
    expect(serialized).not.toContain('"/es/"');
  });
});
