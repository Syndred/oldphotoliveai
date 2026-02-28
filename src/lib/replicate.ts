// Replicate API client with fixed model versions and animation parameters
// Requirements: 16.1, 16.2, 16.3

import Replicate from "replicate";
import { config } from "./config";
import { withRetry } from "./retry";

// Fixed model versions - readonly, not overridable (Req 16.1)
// Balanced for better quality while keeping cost under control.
export const MODELS = {
  restoration:
    "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2",
  colorization:
    "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695",
  animation:
    "bytedance/seedance-1-lite:78c9c4b0a7056c911b0483f58349b9931aff30d6465e7ab665e6c852949ce6d5",
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

export type ModelKey = keyof typeof MODELS;

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
 * - For the animation model, ANIMATION_PARAMS are merged into the input
 *   with ANIMATION_PARAMS taking precedence (cannot be overridden by caller).
 *
 * @param modelKey - Which model to run: "restoration", "colorization", or "animation"
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
    modelKey === "animation" ? normalizeAnimationInput(input) : input;

  // For animation model, merge fixed params with precedence over caller input.
  const finalInput =
    modelKey === "animation"
      ? { ...normalizedAnimationInput, ...ANIMATION_PARAMS }
      : { ...input };

  const output = await withRetry(
    () => client.run(modelVersion, { input: finalInput }),
    { maxRetries: 3, baseDelay: 3000, maxDelay: 15000, backoffMultiplier: 2 }
  );

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
