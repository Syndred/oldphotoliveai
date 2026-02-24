// Replicate API client with fixed model versions and animation parameters
// Requirements: 16.1, 16.2, 16.3

import Replicate from "replicate";
import { config } from "./config";
import { withRetry } from "./retry";

// Fixed model versions — readonly, not overridable (Req 16.1)
export const MODELS = {
  restoration: "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
  colorization: "piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695",
  animation: "minimax/video-01-live",
} as const;

// Fixed animation parameters — readonly, not overridable (Req 16.2)
// Uses minimax/video-01-live params
export const ANIMATION_PARAMS = {
  prompt: "Bring this old photo to life with natural facial expressions and subtle movement",
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

  // For animation model, merge fixed params with precedence over caller input
  const finalInput =
    modelKey === "animation"
      ? { ...input, ...ANIMATION_PARAMS }
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
