import sharp from "sharp";
import { UserTier, RESOLUTION_CONFIG } from "@/types";

/**
 * Apply a text watermark ("OldPhotoLive AI") to the bottom-right corner
 * of an image with 30% opacity.
 */
export async function applyImageWatermark(
  imageBuffer: Buffer
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width ?? 800;
  const height = metadata.height ?? 600;

  // Scale font size relative to image width (roughly 2.5% of width, min 16px)
  const fontSize = Math.max(Math.round(width * 0.025), 16);
  const padding = Math.max(Math.round(width * 0.02), 10);

  const watermarkText = "OldPhotoLive AI";

  // Create SVG overlay with text at bottom-right, 30% opacity
  const svgOverlay = Buffer.from(
    `<svg width="${width}" height="${height}">
      <text
        x="${width - padding}"
        y="${height - padding}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        fill="white"
        fill-opacity="0.3"
        text-anchor="end"
      >${watermarkText}</text>
    </svg>`
  );

  return sharp(imageBuffer)
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .toBuffer();
}

/**
 * Resize an image based on user tier using RESOLUTION_CONFIG.
 * Uses `fit: 'inside'` to maintain aspect ratio.
 * Free tier: max 800×600, Paid tiers: max 1920×1080.
 */
export async function resizeImage(
  imageBuffer: Buffer,
  tier: UserTier
): Promise<Buffer> {
  const config =
    tier === "free" ? RESOLUTION_CONFIG.free : RESOLUTION_CONFIG.paid;

  return sharp(imageBuffer)
    .resize(config.maxWidth, config.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
}
