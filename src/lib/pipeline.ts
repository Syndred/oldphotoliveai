import { getUser } from "./redis";
import {
  runModel,
  ANIMATION_PARAMS,
  ProviderCreationUnknownError,
  ReplicatePredictionCreateRejectedError,
} from "./replicate";
import { uploadToR2, getR2CdnUrl } from "./r2";
import { applyImageWatermark, resizeImage } from "./watermark";
import {
  checkImage,
  checkText,
  CONTENT_REJECTED_MESSAGE,
} from "./moderation";
import { ReplicateSpendLimitError } from "./replicate-spend";
import { v4 as uuidv4 } from "uuid";
import type { TaskFailureStage, TaskWorkflow, UserTier } from "@/types";
import { classifyPipelineFailure } from "@/lib/pipeline-error";
import {
  assertTaskExecutionOwned,
  getTaskForExecution,
  updateTaskStatusFenced,
  WorkerOwnershipLostError,
} from "@/lib/task-execution";

export class ContentViolationError extends Error {
  readonly moderationReason?: string;

  constructor(message = CONTENT_REJECTED_MESSAGE, moderationReason?: string) {
    super(message);
    this.name = "ContentViolationError";
    this.moderationReason = moderationReason;
  }
}

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

function getTaskWorkflow(workflow: TaskWorkflow | undefined): TaskWorkflow {
  return workflow ?? "full";
}

function needsColorization(workflow: TaskWorkflow): boolean {
  return workflow === "full" || workflow === "colorize";
}

function needsAnimation(workflow: TaskWorkflow): boolean {
  return workflow === "full" || workflow === "animate";
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

async function assertImageAllowed(imageUrl: string, stage: string): Promise<void> {
  const result = await checkImage(imageUrl);
  if (!result.passed) {
    throw new ContentViolationError(
      CONTENT_REJECTED_MESSAGE,
      `${stage}:${result.reason ?? "flagged"}`
    );
  }
}

async function assertAnimationPromptAllowed(): Promise<void> {
  const result = await checkText(ANIMATION_PARAMS.prompt);
  if (!result.passed) {
    throw new ContentViolationError(
      CONTENT_REJECTED_MESSAGE,
      `animation_prompt:${result.reason ?? "flagged"}`
    );
  }
}

export interface PipelineExecutionContext {
  executionToken: string;
  signal: AbortSignal;
}

export async function executePipeline(
  taskId: string,
  context: PipelineExecutionContext
): Promise<void> {
  const { executionToken, signal } = context;
  const task = await getTaskForExecution(taskId, executionToken, signal);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  const checkpoint = () =>
    assertTaskExecutionOwned(taskId, executionToken, signal);
  const updateStatus = (
    status: Parameters<typeof updateTaskStatusFenced>[2],
    data?: Partial<typeof task>
  ) => updateTaskStatusFenced(taskId, executionToken, status, data, signal);

  const user = await getUser(task.userId);
  await checkpoint();
  if (!user) {
    await updateStatus("failed", {
      errorMessage: "The task account is unavailable. Please sign in again or contact support.",
      internalErrorMessage: `User not found: ${task.userId}`,
      failureCode: "processing_failed",
      failureStage: null,
      violation: false,
    });
    return;
  }

  const tier = user.tier;
  const tierModelConfig = getTierModelConfig(tier);
  const workflow = getTaskWorkflow(task.workflow);
  let failureStage: TaskFailureStage = null;

  try {
    let restoredKey = task.restoredImageKey;
    let restoredCdnUrl: string | null = restoredKey ? getR2CdnUrl(restoredKey) : null;

    if (!restoredKey || !restoredCdnUrl) {
      failureStage = "restoring";
      await updateStatus("restoring");

      const originalCdnUrl = getR2CdnUrl(task.originalImageKey);
      await assertSourceImageAccessible(originalCdnUrl);
      await checkpoint();
      // Block NSFW uploads before any Replicate spend.
      await assertImageAllowed(originalCdnUrl, "source");
      await checkpoint();

      const restoredOutputUrl = await runModel(
        tierModelConfig.restoration.modelKey,
        tierModelConfig.restoration.createInput(originalCdnUrl),
        { taskId, stage: "restoring", executionToken, signal }
      );

      // Drop flagged outputs — never upload or return them to the user.
      await assertImageAllowed(restoredOutputUrl, "restored");
      await checkpoint();

      const restoredBuffer = await downloadBuffer(restoredOutputUrl);
      await checkpoint();
      const processedRestored = await applyImageTierSettings(restoredBuffer, tier);
      await checkpoint();
      restoredKey = createDerivedAssetKey(taskId, "restored", "jpg");
      await uploadToR2(processedRestored, restoredKey, "image/jpeg");
      await checkpoint();
      restoredCdnUrl = getR2CdnUrl(restoredKey);
    }

    if (!restoredKey || !restoredCdnUrl) {
      throw new Error("Restored image missing after restoration step.");
    }

    const shouldColorize = needsColorization(workflow);
    const shouldAnimate = needsAnimation(workflow);

    if (!shouldColorize && !shouldAnimate) {
      await updateStatus("completed", {
        restoredImageKey: restoredKey,
        errorMessage: null,
        internalErrorMessage: null,
        failureStage: null,
        violation: false,
      });
      return;
    }

    let colorizedKey = task.colorizedImageKey;
    let colorizedCdnUrl: string | null = colorizedKey ? getR2CdnUrl(colorizedKey) : null;

    if (shouldColorize && (!colorizedKey || !colorizedCdnUrl)) {
      failureStage = "colorizing";
      await updateStatus("colorizing", {
        restoredImageKey: restoredKey,
      });

      const colorizedOutputUrl = await runModel(
        "colorization",
        {
          image: restoredCdnUrl,
          ...tierModelConfig.colorization,
        },
        { taskId, stage: "colorizing", executionToken, signal }
      );

      await assertImageAllowed(colorizedOutputUrl, "colorized");
      await checkpoint();

      const colorizedBuffer = await downloadBuffer(colorizedOutputUrl);
      await checkpoint();
      const processedColorized = await applyImageTierSettings(colorizedBuffer, tier);
      await checkpoint();
      colorizedKey = createDerivedAssetKey(taskId, "colorized", "jpg");
      await uploadToR2(processedColorized, colorizedKey, "image/jpeg");
      await checkpoint();
      colorizedCdnUrl = getR2CdnUrl(colorizedKey);
    }

    if (shouldColorize && (!colorizedKey || !colorizedCdnUrl)) {
      throw new Error("Colorized image missing after colorization step.");
    }

    if (!shouldAnimate) {
      await updateStatus("completed", {
        restoredImageKey: restoredKey,
        colorizedImageKey: colorizedKey,
        errorMessage: null,
        internalErrorMessage: null,
        failureStage: null,
        violation: false,
      });
      return;
    }

    failureStage = "animating";
    await updateStatus("animating", {
      restoredImageKey: restoredKey,
      ...(colorizedKey ? { colorizedImageKey: colorizedKey } : {}),
    });

    await assertAnimationPromptAllowed();
    await checkpoint();

    const animationInputUrl = colorizedCdnUrl ?? restoredCdnUrl;
    const animationOutputUrl = await runModel(
      tierModelConfig.animation.modelKey,
      tierModelConfig.animation.createInput(animationInputUrl),
      { taskId, stage: "animating", executionToken, signal }
    );

    const animationBuffer = await downloadBuffer(animationOutputUrl);
    await checkpoint();
    const animationKey = createDerivedAssetKey(taskId, "animation", "mp4");
    await uploadToR2(animationBuffer, animationKey, "video/mp4");
    await checkpoint();

    await updateStatus("completed", {
      restoredImageKey: restoredKey,
      ...(colorizedKey ? { colorizedImageKey: colorizedKey } : {}),
      animationVideoKey: animationKey,
      errorMessage: null,
      internalErrorMessage: null,
      failureStage: null,
      violation: false,
    });
  } catch (error) {
    if (error instanceof WorkerOwnershipLostError || signal.aborted) {
      throw new WorkerOwnershipLostError(taskId);
    }

    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error(`Pipeline failed for task ${taskId}:`, rawMessage);

    const isViolation = error instanceof ContentViolationError;
    const isSpendLimit =
      error instanceof ReplicateSpendLimitError ||
      rawMessage.startsWith("REPLICATE_SPEND_LIMIT:");
    const isProviderCreationUnknown =
      error instanceof ProviderCreationUnknownError ||
      rawMessage.startsWith("PROVIDER_CREATION_UNKNOWN");
    const isDefinitiveCreateRejection =
      error instanceof ReplicatePredictionCreateRejectedError;

    const classification = classifyPipelineFailure(rawMessage, {
      isViolation,
      isSpendLimit,
      isProviderCreationUnknown,
    });

    const internalDetail =
      isViolation && error instanceof ContentViolationError
        ? `violation:${error.moderationReason ?? rawMessage}`
        : rawMessage;

    await updateStatus("failed", {
      errorMessage: classification.errorMessage,
      internalErrorMessage: internalDetail,
      failureStage,
      failureCode: classification.failureCode,
      violation: classification.violation,
      ...(isDefinitiveCreateRejection
        ? { providerCreationDefinitivelyRejected: true }
        : {}),
    });
  }
}
