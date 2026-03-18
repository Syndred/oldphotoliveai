import sharp from "sharp";
import { applyImageWatermark, resizeImage } from "@/lib/watermark";

/** Create a solid-color test image of the given dimensions. */
async function createTestImage(
  width: number,
  height: number
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("resizeImage", () => {
  it("resizes to within 800x600 for free tier", async () => {
    const input = await createTestImage(2000, 1500);
    const output = await resizeImage(input, "free");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBeLessThanOrEqual(800);
    expect(meta.height).toBeLessThanOrEqual(600);
  });

  it("resizes to within the 2K export cap for paid tier (pay_as_you_go)", async () => {
    const input = await createTestImage(3000, 2000);
    const output = await resizeImage(input, "pay_as_you_go");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBeLessThanOrEqual(2048);
    expect(meta.height).toBeLessThanOrEqual(2048);
  });

  it("resizes to within the 2K export cap for paid tier (professional)", async () => {
    const input = await createTestImage(3000, 2000);
    const output = await resizeImage(input, "professional");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBeLessThanOrEqual(2048);
    expect(meta.height).toBeLessThanOrEqual(2048);
  });

  it("maintains aspect ratio", async () => {
    const input = await createTestImage(2000, 1000);
    const output = await resizeImage(input, "free");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(400);
  });

  it("does not enlarge a small image (withoutEnlargement)", async () => {
    const input = await createTestImage(400, 300);
    const output = await resizeImage(input, "free");

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });
});

describe("applyImageWatermark", () => {
  it("changes pixel content to visibly mark free-tier output", async () => {
    const input = await createTestImage(800, 600);
    const output = await applyImageWatermark(input);
    expect(output.equals(input)).toBe(false);
  });

  it("returns a valid image buffer", async () => {
    const input = await createTestImage(800, 600);
    const output = await applyImageWatermark(input);

    expect(Buffer.isBuffer(output)).toBe(true);
    expect(output.length).toBeGreaterThan(0);

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  });

  it("preserves image dimensions", async () => {
    const input = await createTestImage(1024, 768);
    const output = await applyImageWatermark(input);

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(768);
  });

  it("works with different image sizes", async () => {
    const small = await createTestImage(200, 150);
    const large = await createTestImage(3000, 2000);

    const smallOut = await applyImageWatermark(small);
    const largeOut = await applyImageWatermark(large);

    expect(Buffer.isBuffer(smallOut)).toBe(true);
    expect(Buffer.isBuffer(largeOut)).toBe(true);

    const smallMeta = await sharp(smallOut).metadata();
    const largeMeta = await sharp(largeOut).metadata();
    expect(smallMeta.width).toBe(200);
    expect(largeMeta.width).toBe(3000);
  });
});
