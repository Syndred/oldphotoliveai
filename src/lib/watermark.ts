import sharp from "sharp";
import { UserTier, RESOLUTION_CONFIG } from "@/types";

/**
 * Apply a compact font-independent watermark to the bottom-right corner.
 *
 * The overlay deliberately avoids SVG text because serverless font fallbacks can
 * render normal letters as square "missing glyph" boxes and bake that artifact
 * into downstream animation jobs.
 */
export async function applyImageWatermark(
  imageBuffer: Buffer
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width ?? 800;
  const height = metadata.height ?? 600;

  const shorterSide = Math.min(width, height);
  const badgeSize = Math.max(Math.round(shorterSide * 0.12), 34);
  const margin = Math.max(Math.round(shorterSide * 0.035), 8);

  const badgeX = Math.max(width - badgeSize - margin, 4);
  const badgeY = Math.max(height - badgeSize - margin, 4);
  const centerX = badgeX + badgeSize / 2;
  const centerY = badgeY + badgeSize / 2;
  const markSize = badgeSize * 0.56;
  const photoX = centerX - markSize / 2;
  const photoY = centerY - markSize / 2;
  const playLeft = centerX - markSize * 0.12;
  const playTop = centerY - markSize * 0.2;
  const playBottom = centerY + markSize * 0.2;
  const playRight = centerX + markSize * 0.26;

  // Draw a semi-transparent dark badge + vector photo/play mark.
  const svgOverlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect
        x="${badgeX}"
        y="${badgeY}"
        width="${badgeSize}"
        height="${badgeSize}"
        rx="${Math.max(Math.round(badgeSize * 0.22), 8)}"
        fill="black"
        fill-opacity="0.42"
        stroke="white"
        stroke-opacity="0.28"
        stroke-width="1"
      />
      <rect
        x="${photoX}"
        y="${photoY}"
        width="${markSize}"
        height="${markSize}"
        rx="${Math.max(markSize * 0.12, 3)}"
        fill="none"
        stroke="white"
        stroke-opacity="0.78"
        stroke-width="${Math.max(markSize * 0.07, 1.5)}"
      />
      <circle
        cx="${photoX + markSize * 0.28}"
        cy="${photoY + markSize * 0.3}"
        r="${Math.max(markSize * 0.08, 1.5)}"
        fill="white"
        fill-opacity="0.72"
      />
      <path
        d="M ${photoX + markSize * 0.12} ${photoY + markSize * 0.78} L ${photoX + markSize * 0.38} ${photoY + markSize * 0.52} L ${photoX + markSize * 0.56} ${photoY + markSize * 0.68} L ${photoX + markSize * 0.88} ${photoY + markSize * 0.36}"
        fill="none"
        stroke="white"
        stroke-opacity="0.55"
        stroke-width="${Math.max(markSize * 0.06, 1.25)}"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M ${playLeft} ${playTop} L ${playLeft} ${playBottom} L ${playRight} ${centerY} Z"
        fill="white"
        fill-opacity="0.86"
      />
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
