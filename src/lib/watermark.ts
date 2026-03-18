import sharp from "sharp";
import { UserTier, RESOLUTION_CONFIG } from "@/types";

/**
 * Apply a text watermark ("OldPhotoLive AI") to the bottom-right corner
 * of an image using a high-contrast badge so free-tier output is visibly marked.
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
  const margin = Math.max(Math.round(width * 0.03), 14);
  const badgePadX = Math.max(Math.round(width * 0.012), 8);
  const badgePadY = Math.max(Math.round(height * 0.01), 6);

  const watermarkText = "OldPhotoLive AI";
  const estimatedTextWidth = Math.round(fontSize * watermarkText.length * 0.58);
  const badgeWidth = estimatedTextWidth + badgePadX * 2;
  const badgeHeight = Math.round(fontSize * 1.25) + badgePadY * 2;

  const badgeX = Math.max(width - badgeWidth - margin, 4);
  const badgeY = Math.max(height - badgeHeight - margin, 4);
  const textX = badgeX + badgeWidth / 2;
  const textY = badgeY + badgeHeight / 2 + fontSize * 0.36;

  // Draw a semi-transparent dark badge + bright text for clear visibility.
  const svgOverlay = Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect
        x="${badgeX}"
        y="${badgeY}"
        width="${badgeWidth}"
        height="${badgeHeight}"
        rx="${Math.max(Math.round(fontSize * 0.35), 6)}"
        fill="black"
        fill-opacity="0.45"
        stroke="white"
        stroke-opacity="0.35"
        stroke-width="1"
      />
      <text
        x="${textX}"
        y="${textY}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        fill="white"
        fill-opacity="0.92"
        text-anchor="middle"
        font-weight="700"
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
    tier === "free"
      ? RESOLUTION_CONFIG.free
      : tier === "professional"
        ? RESOLUTION_CONFIG.professional
        : RESOLUTION_CONFIG.payAsYouGo;

  return sharp(imageBuffer)
    .resize(config.maxWidth, config.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
}
