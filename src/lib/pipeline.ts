import { getTask, updateTaskStatus, getUser } from "./redis";
import { runModel } from "./replicate";
import { uploadToR2, getR2CdnUrl } from "./r2";
import { applyImageWatermark, resizeImage } from "./watermark";
import { v4 as uuidv4 } from "uuid";
import type { TaskFailureStage, UserTier } from "@/types";

const DOWNLOAD_TIMEOUT_MS = 30_000;
const DOWNLOAD_MAX_RETRIES = 2;
const DOWNLOAD_MAX_BYTES = 120 * 1024 * 1024;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

interface TierModelConfig {
  restoration: {
    modelKey: "restoration" | "restorationPremium";
    createInput: (imageUrl: string) => Record<string, unknown>;
  };
  colorization: {
    model_size: "large";
  };
  animation: {
    modelKey: "animationFree" | "animationPaid" | "animationPremium";
    createInput: (imageUrl: string) => Record<string, unknown>;
  };
}

const TIER_MODEL_CONFIG: Record<UserTier, TierModelConfig> = {
  free: {
    restoration: {
      modelKey: "restoration",
      createInput: (imageUrl: string) => ({
        img: imageUrl,
        version: "v1.4",
        scale: 1,
      }),
    },
    colorization: { model_size: "large" },
    animation: {
      modelKey: "animationFree",
      createInput: (imageUrl: string) => ({
        input_image: imageUrl,
      }),
    },
  },
  pay_as_you_go: {
    restoration: {
      modelKey: "restorationPremium",
      createInput: (imageUrl: string) => ({
        image: imageUrl,
        with_scratch: true,
        HR: true,
      }),
    },
    colorization: { model_size: "large" },
    animation: {
      modelKey: "animationPaid",
      createInput: (imageUrl: string) => ({
        input_image: imageUrl,
      }),
    },
  },
  professional: {
    restoration: {
      modelKey: "restorationPremium",
      createInput: (imageUrl: string) => ({
        image: imageUrl,
        with_scratch: true,
        HR: true,
      }),
    },
    colorization: { model_size: "large" },
    animation: {
      modelKey: "animationPremium",
      createInput: (imageUrl: string) => ({
        input_image: imageUrl,
      }),
    },
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

async function assertSourceImageAccessible(url: string): Promise<void> {
  const headResponse = await fetchWithTimeout(
    url,
    { method: "HEAD" },
    10_000
  );
  if (headResponse.ok) return;

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

function isFreeTier(tier: UserTier): boolean {
  return tier === "free";
}

function getTierModelConfig(tier: UserTier): TierModelConfig {
  return TIER_MODEL_CONFIG[tier];
}

function createDerivedAssetKey(
  taskId: string,
  label: "restored" | "colorized" | "animation",
  extension: "jpg" | "mp4"
): string {
  return `tasks/${taskId}/${label}-${uuidv4()}.${extension}`;
}

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

export async function executePipeline(taskId: string): Promise<void> {
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
  let failureStage: TaskFailureStage = null;

  try {
    let restoredKey = task.restoredImageKey;
    let restoredCdnUrl: string | null = restoredKey ? getR2CdnUrl(restoredKey) : null;

    if (!restoredKey || !restoredCdnUrl) {
      failureStage = "restoring";
      await updateTaskStatus(taskId, "restoring");

      const originalCdnUrl = getR2CdnUrl(task.originalImageKey);
      await assertSourceImageAccessible(originalCdnUrl);
      const restoredOutputUrl = await runModel(
        tierModelConfig.restoration.modelKey,
        tierModelConfig.restoration.createInput(originalCdnUrl)
      );

      const restoredBuffer = await downloadBuffer(restoredOutputUrl);
      const processedRestored = await applyImageTierSettings(restoredBuffer, tier);
      restoredKey = createDerivedAssetKey(taskId, "restored", "jpg");
      await uploadToR2(processedRestored, restoredKey, "image/jpeg");
      restoredCdnUrl = getR2CdnUrl(restoredKey);
    }

    if (!restoredKey || !restoredCdnUrl) {
      throw new Error("Restored image missing after restoration step.");
    }

    let colorizedKey = task.colorizedImageKey;
    let colorizedCdnUrl: string | null = colorizedKey ? getR2CdnUrl(colorizedKey) : null;

    if (!colorizedKey || !colorizedCdnUrl) {
      failureStage = "colorizing";
      await updateTaskStatus(taskId, "colorizing", {
        restoredImageKey: restoredKey,
      });

      const colorizedOutputUrl = await runModel("colorization", {
        image: restoredCdnUrl,
        ...tierModelConfig.colorization,
      });

      const colorizedBuffer = await downloadBuffer(colorizedOutputUrl);
      const processedColorized = await applyImageTierSettings(colorizedBuffer, tier);
      colorizedKey = createDerivedAssetKey(taskId, "colorized", "jpg");
      await uploadToR2(processedColorized, colorizedKey, "image/jpeg");
      colorizedCdnUrl = getR2CdnUrl(colorizedKey);
    }

    if (!colorizedKey || !colorizedCdnUrl) {
      throw new Error("Colorized image missing after colorization step.");
    }

    failureStage = "animating";
    await updateTaskStatus(taskId, "animating", {
      colorizedImageKey: colorizedKey,
    });

    const animationOutputUrl = await runModel(
      tierModelConfig.animation.modelKey,
      tierModelConfig.animation.createInput(colorizedCdnUrl)
    );

    const animationBuffer = await downloadBuffer(animationOutputUrl);
    const animationKey = createDerivedAssetKey(taskId, "animation", "mp4");
    await uploadToR2(animationBuffer, animationKey, "video/mp4");

    await updateTaskStatus(taskId, "completed", {
      animationVideoKey: animationKey,
      errorMessage: null,
      internalErrorMessage: null,
      failureStage: null,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error(`Pipeline failed for task ${taskId}:`, rawMessage);

    let errorMessage = "Processing failed. Please try again.";
    if (
      rawMessage.includes("429") ||
      rawMessage.includes("throttled") ||
      rawMessage.includes("rate limit")
    ) {
      errorMessage = "Service is temporarily busy. Please try again in a moment.";
    } else if (
      rawMessage.includes("401") ||
      rawMessage.includes("Unauthenticated") ||
      rawMessage.includes("authentication token")
    ) {
      errorMessage = "AI model configuration error. Please contact support.";
    } else if (
      rawMessage.includes("422") ||
      rawMessage.includes("Invalid version")
    ) {
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
    } else if (
      rawMessage.includes("Task not found") ||
      rawMessage.includes("User not found")
    ) {
      errorMessage = rawMessage;
    }

    await updateTaskStatus(taskId, "failed", {
      errorMessage,
      internalErrorMessage: rawMessage,
      failureStage,
    });
  }
}
