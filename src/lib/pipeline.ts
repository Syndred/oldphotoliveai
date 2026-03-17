// AI Processing Pipeline
// Requirements: 3.1-3.10, 4.2
// Called by Worker, not directly by API Routes

import { getTask, updateTaskStatus, getUser } from "./redis";
import { runModel } from "./replicate";
import { uploadToR2, getR2CdnUrl } from "./r2";
import { applyImageWatermark, resizeImage } from "./watermark";
import type { UserTier } from "@/types";

const DOWNLOAD_TIMEOUT_MS = 30_000;
const DOWNLOAD_MAX_RETRIES = 2;
const DOWNLOAD_MAX_BYTES = 120 * 1024 * 1024; // 120 MB cap for intermediate assets
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

interface TierModelConfig {
  restoration: {
    upscale: number;
    face_upsample: boolean;
    background_enhance: boolean;
    codeformer_fidelity: number;
  };
  colorization: {
    model_size: "large";
  };
}

const TIER_MODEL_CONFIG: Record<UserTier, TierModelConfig> = {
  free: {
    restoration: {
      upscale: 1,
      face_upsample: true,
      background_enhance: false,
      codeformer_fidelity: 0.55,
    },
    colorization: { model_size: "large" },
  },
  pay_as_you_go: {
    restoration: {
      upscale: 2,
      face_upsample: true,
      background_enhance: true,
      codeformer_fidelity: 0.6,
    },
    colorization: { model_size: "large" },
  },
  professional: {
    restoration: {
      upscale: 2,
      face_upsample: true,
      background_enhance: true,
      codeformer_fidelity: 0.6,
    },
    colorization: { model_size: "large" },
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function backoffDelayMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 5000);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DOWNLOAD_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`Download timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseToBuffer(response: Response): Promise<Buffer> {
  const contentLength =
    typeof response.headers?.get === "function"
      ? response.headers.get("content-length")
      : null;
  if (contentLength) {
    const declared = Number(contentLength);
    if (!Number.isNaN(declared) && declared > DOWNLOAD_MAX_BYTES) {
      throw new Error(`DOWNLOAD_TOO_LARGE:${declared}`);
    }
  }

  if (!response.body) {
    const fallbackBuffer = await response.arrayBuffer();
    if (fallbackBuffer.byteLength > DOWNLOAD_MAX_BYTES) {
      throw new Error(`DOWNLOAD_TOO_LARGE:${fallbackBuffer.byteLength}`);
    }
    return Buffer.from(fallbackBuffer);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > DOWNLOAD_MAX_BYTES) {
      await reader.cancel();
      throw new Error(`DOWNLOAD_TOO_LARGE:${total}`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

/**
 * Download a file from a URL and return it as a Buffer.
 */
async function downloadBuffer(url: string): Promise<Buffer> {
  for (let attempt = 0; attempt <= DOWNLOAD_MAX_RETRIES; attempt++) {
    let response: Response;

    try {
      response = await fetchWithTimeout(url);
    } catch (error) {
      if (attempt < DOWNLOAD_MAX_RETRIES) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }
      throw error;
    }

    if (!response || typeof response.ok !== "boolean") {
      if (attempt < DOWNLOAD_MAX_RETRIES) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }
      throw new Error(`Failed to download from ${url}: invalid response`);
    }

    if (!response.ok) {
      const message =
        `Failed to download from ${url}: ${response.status} ${response.statusText}`.trim();
      if (RETRYABLE_HTTP_STATUSES.has(response.status) && attempt < DOWNLOAD_MAX_RETRIES) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }
      throw new Error(message);
    }

    try {
      return await readResponseToBuffer(response);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("DOWNLOAD_TOO_LARGE:")
      ) {
        throw error;
      }

      if (attempt < DOWNLOAD_MAX_RETRIES) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed to download from ${url}`);
}

/**
 * Verify source image URL is reachable before passing it to model APIs.
 * Gives a deterministic, actionable error when bucket/domain config is wrong.
 */
async function assertSourceImageAccessible(url: string): Promise<void> {
  const headResponse = await fetchWithTimeout(
    url,
    { method: "HEAD" },
    10_000
  );
  if (headResponse.ok) return;

  // Some origins may not support HEAD. Fall back to a tiny ranged GET probe.
  if (headResponse.status === 405 || headResponse.status === 501) {
    const probeResponse = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: { Range: "bytes=0-0" },
      },
      10_000
    );
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

function getTierModelConfig(tier: UserTier): TierModelConfig {
  return TIER_MODEL_CONFIG[tier];
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
 * 2. Restoration (CodeFormer) → apply tier settings → upload to R2
 * 3. Colorization (DDColor) → apply tier settings → upload to R2
 * 4. Animation (Stable Video Diffusion) → upload to R2
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
  const tierModelConfig = getTierModelConfig(tier);

  try {
    // ── Step 1: Restoration ─────────────────────────────────────────────
    await updateTaskStatus(taskId, "restoring");

    const originalCdnUrl = getR2CdnUrl(task.originalImageKey);
    await assertSourceImageAccessible(originalCdnUrl);
    const restoredOutputUrl = await runModel("restoration", {
      image: originalCdnUrl,
      ...tierModelConfig.restoration,
    });

    // Download, apply tier settings, upload
    const restoredBuffer = await downloadBuffer(restoredOutputUrl);
    const processedRestored = await applyImageTierSettings(restoredBuffer, tier);
    const restoredKey = `tasks/${taskId}/restored.jpg`;
    await uploadToR2(processedRestored, restoredKey, "image/jpeg");
    const restoredCdnUrl = getR2CdnUrl(restoredKey);

    // ── Step 2: Colorization ────────────────────────────────────────────
    await updateTaskStatus(taskId, "colorizing", { restoredImageKey: restoredKey });

    const colorizedOutputUrl = await runModel("colorization", {
      image: restoredCdnUrl,
      ...tierModelConfig.colorization,
    });

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
    } else if (
      rawMessage.includes("401") ||
      rawMessage.includes("Unauthenticated") ||
      rawMessage.includes("authentication token")
    ) {
      errorMessage = "AI model configuration error. Please contact support.";
    } else if (rawMessage.includes("422") || rawMessage.includes("Invalid version")) {
      errorMessage = "AI model configuration error. Please contact support.";
    } else if (rawMessage.startsWith("SOURCE_IMAGE_UNREACHABLE:")) {
      const detail = rawMessage.replace("SOURCE_IMAGE_UNREACHABLE:", "").trim();
      const suffix = detail ? ` (${detail})` : "";
      errorMessage =
        `Source image URL is unreachable${suffix}. Please re-upload or check R2 bucket/domain configuration.`;
    } else if (
      rawMessage.includes("Failed to download") ||
      rawMessage.includes("Download timeout") ||
      rawMessage.startsWith("DOWNLOAD_TOO_LARGE:")
    ) {
      errorMessage = "Failed to download intermediate result. Please try again.";
    } else if (rawMessage.includes("Task not found") || rawMessage.includes("User not found")) {
      errorMessage = rawMessage; // These are safe to show
    }

    await updateTaskStatus(taskId, "failed", { errorMessage });
  }
}
