// Replicate API client with fixed model versions and animation parameters
// Requirements: 16.1, 16.2, 16.3

import Replicate from "replicate";
import { config } from "./config";

// Fixed model versions — readonly, not overridable (Req 16.1)
export const MODELS = {
  restoration: "tencentarc/gfpgan:9283608cc6b7",
  colorization: "piddnad/ddcolor:8ca1066c7138",
  animation: "anotherframe/animate-diffusion:26d6c9f70b69",
} as const;

// Fixed animation parameters — readonly, not overridable (Req 16.2)
export const ANIMATION_PARAMS = {
  motion_bucket_id: 1,
  fps: 24,
  duration: 4,
  output_format: "mp4",
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

  const output = await client.run(modelVersion, { input: finalInput });

  // Replicate output can be a string URL, an array of URLs, or an object.
  // Normalize to a single URL string.
  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output) && output.length > 0) {
    return String(output[0]);
  }

  // Some models return an object with an "output" or "url" field
  if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.url === "string") return obj.url;
  }

  throw new Error(
    `Unexpected output format from model "${modelKey}": ${JSON.stringify(output)}`
  );
}
