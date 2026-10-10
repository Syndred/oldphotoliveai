import { PHOTO_RESTORATION_COST as content } from "@/content/photo-restoration-cost";
import { generateMetadata } from "@/app/[locale]/photo-restoration-cost/page";

jest.mock("@/components/PhotoRestorationCostPage", () => ({ __esModule: true, default: () => null }));

describe("photo restoration cost guide", () => {
  it("uses its own canonical price-intent URL", () => {
    const metadata = generateMetadata();
    expect(metadata.alternates?.canonical).toBe("/photo-restoration-cost");
    expect(content.keywords).toContain("photo restoration cost");
    expect(metadata.robots).not.toEqual(expect.objectContaining({ index: false }));
  });

  it("quotes only our fixed price and requires inspection for a manual quote", () => {
    expect(content.comparison[0].price).toContain("$1.99");
    expect(content.comparison[1].price).toBe("Quoted after inspection");
    expect(content.comparison[1].price).not.toMatch(/[£$€¥]\s*\d/);
    expect(content.sections.flatMap(section => section.paragraphs).join(" ")).toContain("it does not establish the original shades");
  });
});
