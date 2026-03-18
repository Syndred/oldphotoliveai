// Replicate API client with fixed model versions and animation parameters
// Requirements: 16.1, 16.2, 16.3

import Replicate from "replicate";
import { config } from "./config";

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
  duration: 2,
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
  input: Record<string, unknown>
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

  // Do not auto-resubmit a model run on failure. Replicate's `run()` creates a
  // prediction and then waits/polls for completion, so retrying the entire call
  // can create duplicate paid predictions for a single user task.
  const output = await client.run(modelVersion, { input: finalInput });

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
