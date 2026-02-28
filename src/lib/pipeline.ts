// AI Processing Pipeline
// Requirements: 3.1-3.10, 4.2
// Called by Worker, not directly by API Routes

import { getTask, updateTaskStatus, getUser } from "./redis";
import { runModel } from "./replicate";
import { uploadToR2, getR2CdnUrl } from "./r2";
import { applyImageWatermark, resizeImage } from "./watermark";
import type { UserTier } from "@/types";

/**
 * Download a file from a URL and return it as a Buffer.
 */
async function downloadBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download from ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Verify source image URL is reachable before passing it to model APIs.
 * Gives a deterministic, actionable error when bucket/domain config is wrong.
 */
async function assertSourceImageAccessible(url: string): Promise<void> {
  const headResponse = await fetch(url, { method: "HEAD" });
  if (headResponse.ok) return;

  // Some origins may not support HEAD. Fall back to a tiny ranged GET probe.
  if (headResponse.status === 405 || headResponse.status === 501) {
    const probeResponse = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });
    if (probeResponse.ok) return;
    throw new Error(
      `SOURCE_IMAGE_UNREACHABLE:${probeResponse.status} ${probeResponse.statusText}`.trim()
    );
  }

  throw new Error(
    `SOURCE_IMAGE_UNREACHABLE:${headResponse.status} ${headResponse.statusText}`.trim()
  );
}

/**
 * Determine whether a user tier is "free" (watermark + low res)
 * or "paid" (no watermark + high res).
 */
function isFreeTier(tier: UserTier): boolean {
  return tier === "free";
}

/**
 * Apply tier-based image processing: resize and optionally watermark.
 * Free users get watermark + 800×600 max.
 * Paid users get no watermark + 1920×1080 max.
 */
async function applyImageTierSettings(
  imageBuffer: Buffer,
  tier: UserTier
): Promise<Buffer> {
  let processed = await resizeImage(imageBuffer, tier);
  if (isFreeTier(tier)) {
    processed = await applyImageWatermark(processed);
  }
  return processed;
}

/**
 * Execute the full AI processing pipeline for a task.
 *
 * Steps:
 * 1. Get task and user from Redis
 * 2. Restoration (GFPGAN) → apply tier settings → upload to R2
 * 3. Colorization (DDColor) → apply tier settings → upload to R2
 * 4. Animation (Animate Diffusion) → upload to R2
 * 5. Mark task as completed
 *
 * If any step fails, the task is marked as "failed" with the error message
 * and no subsequent steps are executed.
 */
export async function executePipeline(taskId: string): Promise<void> {
  // ── Step 0: Load task and user ──────────────────────────────────────────
  const task = await getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const user = await getUser(task.userId);
  if (!user) {
    await updateTaskStatus(taskId, "failed", {
      errorMessage: `User not found: ${task.userId}`,
    });
    return;
  }

  const tier = user.tier;

  try {
    // ── Step 1: Restoration ─────────────────────────────────────────────
    await updateTaskStatus(taskId, "restoring");

    const originalCdnUrl = getR2CdnUrl(task.originalImageKey);
    await assertSourceImageAccessible(originalCdnUrl);
    const restoredOutputUrl = await runModel("restoration", { img: originalCdnUrl });

    // Download, apply tier settings, upload
    const restoredBuffer = await downloadBuffer(restoredOutputUrl);
    const processedRestored = await applyImageTierSettings(restoredBuffer, tier);
    const restoredKey = `tasks/${taskId}/restored.jpg`;
    await uploadToR2(processedRestored, restoredKey, "image/jpeg");
    const restoredCdnUrl = getR2CdnUrl(restoredKey);

    // ── Step 2: Colorization ────────────────────────────────────────────
    await updateTaskStatus(taskId, "colorizing", { restoredImageKey: restoredKey });

    const colorizedOutputUrl = await runModel("colorization", { image: restoredCdnUrl });

    // Download, apply tier settings, upload
    const colorizedBuffer = await downloadBuffer(colorizedOutputUrl);
    const processedColorized = await applyImageTierSettings(colorizedBuffer, tier);
    const colorizedKey = `tasks/${taskId}/colorized.jpg`;
    await uploadToR2(processedColorized, colorizedKey, "image/jpeg");
    const colorizedCdnUrl = getR2CdnUrl(colorizedKey);

    // ── Step 3: Animation (SVD uses input_image) ────────
    await updateTaskStatus(taskId, "animating", { colorizedImageKey: colorizedKey });

    const animationOutputUrl = await runModel("animation", { input_image: colorizedCdnUrl });

    // Download animation video and upload to R2 (no image tier settings for video)
    const animationBuffer = await downloadBuffer(animationOutputUrl);
    const animationKey = `tasks/${taskId}/animation.mp4`;
    await uploadToR2(animationBuffer, animationKey, "video/mp4");

    // ── Step 4: Complete ────────────────────────────────────────────────
    await updateTaskStatus(taskId, "completed", { animationVideoKey: animationKey });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error(`Pipeline failed for task ${taskId}:`, rawMessage);

    // Sanitize error message — never expose raw API errors to users
    let errorMessage = "Processing failed. Please try again.";
    if (rawMessage.includes("429") || rawMessage.includes("throttled") || rawMessage.includes("rate limit")) {
      errorMessage = "Service is temporarily busy. Please try again in a moment.";
    } else if (rawMessage.includes("422") || rawMessage.includes("Invalid version")) {
      errorMessage = "AI model configuration error. Please contact support.";
    } else if (rawMessage.startsWith("SOURCE_IMAGE_UNREACHABLE:")) {
      const detail = rawMessage.replace("SOURCE_IMAGE_UNREACHABLE:", "").trim();
      const suffix = detail ? ` (${detail})` : "";
      errorMessage =
        `Source image URL is unreachable${suffix}. Please re-upload or check R2 bucket/domain configuration.`;
    } else if (rawMessage.includes("Failed to download")) {
      errorMessage = "Failed to download intermediate result. Please try again.";
    } else if (rawMessage.includes("Task not found") || rawMessage.includes("User not found")) {
      errorMessage = rawMessage; // These are safe to show
    }

    await updateTaskStatus(taskId, "failed", { errorMessage });
  }
}
