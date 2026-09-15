// Replicate API client with fixed model versions and animation parameters
// Requirements: 16.1, 16.2, 16.3

import Replicate, { type Prediction } from "replicate";
import { config } from "./config";
import { assertAndReserveReplicateSpend } from "./replicate-spend";
import {
  getTaskForExecution,
  updateTaskProviderInvocationFenced,
  WorkerOwnershipLostError,
} from "./task-execution";
import type { ProviderInvocation, TaskProviderStage } from "@/types";

// Fixed model versions - readonly, not overridable (Req 16.1)
// Free users use a lightweight face restoration model. Paid users use a
// dedicated old-photo restoration model that is better at repairing
// scratches, creases, and paper damage before the shared colorization step.
export const MODELS = {
  restoration:
    "tencentarc/gfpgan:21c4d9d8e427bab060aff58f43823260e33b3620de1f87e8418a1df9b05f7b55",
  restorationPremium:
    "microsoft/bringing-old-photos-back-to-life:c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799",
  colorization:
    "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695",
  animationFree:
    "bytedance/seedance-1-lite:cf47c0693227ff7221d3efea90e442335f4de350bc04080db7f59e7cd5b694d6",
  animationPaid:
    "bytedance/seedance-1-lite:cf47c0693227ff7221d3efea90e442335f4de350bc04080db7f59e7cd5b694d6",
  animationPremium:
    "bytedance/seedance-1-pro:edcd35c62d96dcd88a9f32a2d6e06f961ff4ef2d32b5b973f6a9d2b80382cb0e",
} as const;

// Fixed animation parameters - readonly, not overridable (Req 16.2)
// Keep animation short and stable for natural micro-expressions.
export const ANIMATION_PARAMS = {
  duration: 4,
  fps: 24,
  camera_fixed: true,
  prompt:
    "natural subtle smile, gentle blink, tiny head nod, preserve identity and facial details",
} as const;

export const ANIMATION_VARIANTS = {
  animationFree: { resolution: "480p" },
  animationPaid: { resolution: "720p" },
  animationPremium: { resolution: "1080p" },
} as const;

export type ModelKey = keyof typeof MODELS;

export interface ModelExecutionContext {
  taskId: string;
  stage: TaskProviderStage;
  executionToken: string;
  signal: AbortSignal;
}

export class ProviderCreationUnknownError extends Error {
  constructor() {
    super("PROVIDER_CREATION_UNKNOWN");
    this.name = "ProviderCreationUnknownError";
  }
}

export class ReplicatePredictionCreateRejectedError extends Error {
  readonly status: number;

  constructor(status: number, statusText: string, detail: string) {
    super(
      `Replicate prediction create rejected with ${status} ${statusText}: ${detail}`.trim()
    );
    this.name = "ReplicatePredictionCreateRejectedError";
    this.status = status;
  }
}

const ANIMATION_MODEL_KEYS = [
  "animationFree",
  "animationPaid",
  "animationPremium",
] as const;

type AnimationModelKey = (typeof ANIMATION_MODEL_KEYS)[number];

/**
 * Creates a Replicate client instance.
 * Extracted for testability.
 */
export function getReplicateClient(): Replicate {
  return new Replicate({ auth: config.replicate.apiToken });
}

/**
 * Runs a fixed AI model on Replicate.
 *
 * - Model versions are readonly constants and cannot be overridden (Req 16.3).
 * - For animation models, ANIMATION_PARAMS and the tier-specific
 *   ANIMATION_VARIANTS are merged into the input with fixed params taking
 *   precedence (cannot be overridden by caller).
 *
 * @param modelKey - Which fixed model to run
 * @param input    - Model input parameters (e.g. { image: "https://..." })
 * @returns The output URL as a string
 */
export async function runModel(
  modelKey: ModelKey,
  input: Record<string, unknown>,
  context: ModelExecutionContext
): Promise<string> {
  const client = getReplicateClient();
  const modelVersion = MODELS[modelKey];

  // Some older call sites pass `input_image` (SVD-style). For Seedance, normalize to `image`.
  const normalizedAnimationInput =
    isAnimationModelKey(modelKey) ? normalizeAnimationInput(input) : input;

  // For animation models, merge fixed params with precedence over caller input.
  const finalInput =
    isAnimationModelKey(modelKey)
      ? {
          ...normalizedAnimationInput,
          ...ANIMATION_PARAMS,
          ...ANIMATION_VARIANTS[modelKey],
        }
      : { ...input };

  const task = await getTaskForExecution(
    context.taskId,
    context.executionToken,
    context.signal
  );
  const existing = task.providerInvocations?.[context.stage];

  if (existing) {
    if (existing.modelKey !== modelKey) {
      throw new ProviderCreationUnknownError();
    }
    if (existing.status === "creation_unknown" && !existing.predictionId) {
      throw new ProviderCreationUnknownError();
    }
    if (existing.status === "succeeded" && existing.outputUrl) {
      return existing.outputUrl;
    }
    if (existing.status === "failed") {
      throw new Error(existing.error || "Replicate prediction failed");
    }
    if (!existing.predictionId) {
      return failCreationUnknown(modelKey, context);
    }
    return pollPrediction(client, modelKey, existing.predictionId, context);
  }

  // Reserve before entering the ambiguous-create boundary. This operation
  // cannot create a provider prediction, so its failures remain safely retryable.
  await assertAndReserveReplicateSpend(modelKey);

  await persistInvocation(context, {
    status: "provider_creation_started",
    modelKey,
    updatedAt: new Date().toISOString(),
  });

  await getTaskForExecution(
    context.taskId,
    context.executionToken,
    context.signal
  );

  let created: Prediction;
  try {
    created = await createPredictionOnce(modelVersion, finalInput, context.signal);
  } catch (error) {
    if (error instanceof WorkerOwnershipLostError || context.signal.aborted) {
      throw new WorkerOwnershipLostError(context.taskId);
    }
    if (error instanceof ReplicatePredictionCreateRejectedError) {
      try {
        await persistInvocation(context, {
          status: "failed",
          modelKey,
          error: error.message,
          updatedAt: new Date().toISOString(),
        });
      } catch (persistenceError) {
        if (persistenceError instanceof WorkerOwnershipLostError) {
          throw persistenceError;
        }
      }
      throw error;
    }
    return failCreationUnknown(modelKey, context, error);
  }

  if (!created.id) {
    return failCreationUnknown(modelKey, context, "missing prediction ID");
  }

  await persistKnownPredictionId(modelKey, created.id, context);

  return pollPrediction(client, modelKey, created.id, context);
}

async function persistKnownPredictionId(
  modelKey: ModelKey,
  predictionId: string,
  context: ModelExecutionContext
): Promise<void> {
  const activeInvocation: ProviderInvocation = {
    status: "active",
    modelKey,
    predictionId,
    updatedAt: new Date().toISOString(),
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await persistInvocation(context, activeInvocation);
      return;
    } catch (error) {
      if (error instanceof WorkerOwnershipLostError) throw error;
      lastError = error;
    }
  }

  // If Redis recovers on this final safe write, retain the known ID and keep
  // polling it. Only an ID that cannot be made durable becomes manual review.
  try {
    await markCreationUnknown(modelKey, context, lastError, predictionId);
    return;
  } catch (error) {
    if (error instanceof WorkerOwnershipLostError) throw error;
    console.error(
      `Failed to persist Replicate prediction ID for task ${context.taskId}:`,
      error
    );
    throw new ProviderCreationUnknownError();
  }
}

/**
 * Submit exactly one provider POST. The Replicate SDK retries thrown transport
 * errors internally, including POST requests, so prediction creation uses the
 * platform fetch directly and deliberately has no retry loop.
 */
async function createPredictionOnce(
  version: string,
  input: Record<string, unknown>,
  signal: AbortSignal
): Promise<Prediction> {
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.replicate.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    if (response.status >= 400 && response.status < 500 && response.status !== 408) {
      throw new ReplicatePredictionCreateRejectedError(
        response.status,
        response.statusText,
        detail
      );
    }
    throw new Error(
      `Replicate prediction create response was uncertain: ${response.status} ${response.statusText} ${detail}`.trim()
    );
  }

  const prediction = await response.json();
  if (!prediction || typeof prediction !== "object") {
    throw new Error("Replicate prediction create returned an invalid response");
  }
  return prediction as Prediction;
}

async function persistInvocation(
  context: ModelExecutionContext,
  invocation: ProviderInvocation
): Promise<void> {
  await updateTaskProviderInvocationFenced(
    context.taskId,
    context.executionToken,
    context.stage,
    invocation,
    context.signal
  );
}

async function markCreationUnknown(
  modelKey: ModelKey,
  context: ModelExecutionContext,
  error?: unknown,
  predictionId?: string
): Promise<void> {
  await persistInvocation(context, {
    status: "creation_unknown",
    modelKey,
    ...(predictionId ? { predictionId } : {}),
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
    updatedAt: new Date().toISOString(),
  });
}

async function failCreationUnknown(
  modelKey: ModelKey,
  context: ModelExecutionContext,
  error?: unknown,
  predictionId?: string
): Promise<never> {
  try {
    await markCreationUnknown(modelKey, context, error, predictionId);
  } catch (persistenceError) {
    if (persistenceError instanceof WorkerOwnershipLostError) {
      throw persistenceError;
    }
    console.error(
      `Failed to persist ambiguous Replicate creation for task ${context.taskId}:`,
      persistenceError
    );
  }
  throw new ProviderCreationUnknownError();
}

async function pollPrediction(
  client: Replicate,
  modelKey: ModelKey,
  predictionId: string,
  context: ModelExecutionContext
): Promise<string> {
  while (true) {
    if (context.signal.aborted) {
      throw new WorkerOwnershipLostError(context.taskId);
    }

    let prediction: Prediction;
    try {
      prediction = await client.predictions.get(predictionId, {
        signal: context.signal,
      });
    } catch (error) {
      if (context.signal.aborted) {
        throw new WorkerOwnershipLostError(context.taskId);
      }
      throw error;
    }

    if (prediction.status === "succeeded") {
      const outputUrl = parseOutput(modelKey, prediction.output);
      await persistInvocation(context, {
        status: "succeeded",
        modelKey,
        predictionId,
        outputUrl,
        updatedAt: new Date().toISOString(),
      });
      return outputUrl;
    }

    if (["failed", "canceled", "aborted"].includes(prediction.status)) {
      const message = prediction.error
        ? `Replicate prediction ${prediction.status}: ${String(prediction.error)}`
        : `Replicate prediction ${prediction.status}`;
      await persistInvocation(context, {
        status: "failed",
        modelKey,
        predictionId,
        error: message,
        updatedAt: new Date().toISOString(),
      });
      throw new Error(message);
    }

    await pollingDelay(context);
  }
}

function pollingDelay(context: ModelExecutionContext): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      context.signal.removeEventListener("abort", onAbort);
      resolve();
    }, 1_000);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new WorkerOwnershipLostError(context.taskId));
    };
    if (context.signal.aborted) {
      onAbort();
      return;
    }
    context.signal.addEventListener("abort", onAbort, { once: true });
  });
}

function parseOutput(modelKey: ModelKey, output: unknown): string {

  // Replicate SDK v1.x returns FileOutput objects (not plain strings).
  // FileOutput has a toString() that returns the URL, but JSON.stringify gives {}.
  // Also handle legacy string/array formats for robustness.
  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output) && output.length > 0) {
    return String(output[0]);
  }

  // FileOutput or any object with a meaningful toString()
  if (output && typeof output === "object") {
    const str = String(output);
    if (str.startsWith("http")) return str;

    const obj = output as Record<string, unknown>;
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.url === "string") return obj.url;
  }

  throw new Error(
    `Unexpected output format from model "${modelKey}": ${String(output)}`
  );
}

function normalizeAnimationInput(
  input: Record<string, unknown>
): Record<string, unknown> {
  const normalized = { ...input };
  if (!("image" in normalized) && typeof normalized.input_image === "string") {
    normalized.image = normalized.input_image;
  }
  // Avoid sending both keys to Seedance.
  if ("input_image" in normalized) {
    delete normalized.input_image;
  }
  return normalized;
}

function isAnimationModelKey(modelKey: ModelKey): modelKey is AnimationModelKey {
  return (ANIMATION_MODEL_KEYS as readonly string[]).includes(modelKey);
}
