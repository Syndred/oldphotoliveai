jest.mock("@/components/HomePageView", () => ({ __esModule: true, default: () => null }));
jest.mock("@/app/pricing/page", () => ({ __esModule: true, default: () => null }));

import { HOME_SEO_CONTENT } from "@/content/home-seo";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import messages from "@/../messages/en.json";
import zhMessages from "@/../messages/zh.json";
import { metadata as homeMetadata } from "@/app/page";
import { generateMetadata } from "@/app/[locale]/page";
import { metadata as pricingMetadata } from "@/app/pricing/layout";

describe("brand and category homepage", () => {
  it("introduces all three tools without taking the colorization landing-page title", () => {
    expect(PAGE_SEO_COPY.en.home.title).toBe("OldPhotoLive AI – AI Photo Restoration, Colorization & Animation");
    expect(messages.landing.hero.title).toBe("Restore, Colorize & Animate Old Photos with AI");
    expect(PAGE_SEO_COPY.en.home.description).toContain("One photo from $1.99");
    expect(PAGE_SEO_COPY.en.home.description).toContain("no subscription");
    expect(homeMetadata.title).toEqual({ absolute: PAGE_SEO_COPY.en.home.title });
  });

  it("keeps the Chinese homepage title absolute and preserves the three tool links", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "zh" }) });
    expect(metadata.title).toEqual({ absolute: "老照片修复与上色 - OldPhotoLive AI" });
    expect(HOME_SEO_CONTENT.en.colorizeCta).toBe("Colorize old photos");
    expect(HOME_SEO_CONTENT.en.restoreCta).toBe("Restore old photos");
    expect(HOME_SEO_CONTENT.en.animateCta).toBe("Animate old photos");
    expect(HOME_SEO_CONTENT.en.contentParagraphs[0]).toMatch(/^OldPhotoLive AI/);
  });

  it("answers separate purchase, workflow, download, and failure questions", () => {
    const faqs = HOME_SEO_CONTENT.en.faqItems;
    expect(faqs).toHaveLength(8);
    expect(new Set(faqs.map(item => item.answer)).size).toBe(faqs.length);
    expect(faqs[0].answer).toContain("$1.99");
    expect(faqs[1].answer).toContain("Each workflow is available separately");
    expect(faqs[6].answer).toContain("without a watermark");
    expect(faqs[7].answer).toContain("one retry at no extra cost");
    expect(JSON.stringify(faqs)).not.toMatch(/free trial|free daily|for free|free generation/i);
  });

  it("sets outcome-oriented pricing metadata and avoids duplicate brand templates", () => {
    expect(pricingMetadata.title).toEqual({ absolute: PAGE_SEO_COPY.en.pricing.title });
    expect(pricingMetadata.description).toContain("get a complete watermark-free result");
    expect(pricingMetadata.keywords).toContain("photo restoration cost");
  });

  it("removes unused trial marketing while retaining legacy subscription controls", () => {
    for (const catalog of [messages, zhMessages]) {
      expect(catalog.pricing).not.toHaveProperty("freeFeature1");
      expect(catalog.pricing).not.toHaveProperty("freeBadge");
      expect(catalog.pricing).not.toHaveProperty("payAsYouGoPeriod");
      expect(catalog.pricing.manageSubscription).toEqual(expect.any(String));
      expect(catalog.pricing.scheduledCancellation).not.toMatch(/Free|免费/);
    }
  });
});
