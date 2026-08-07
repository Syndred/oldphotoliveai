/**
 * Content moderation (text + image).
 *
 * Default image provider: Replicate `falcons-ai/nsfw_image_detection`
 * (uses existing REPLICATE_API_TOKEN — no OpenAI billing required).
 *
 * Optional: set MODERATION_PROVIDER=openai to use OpenAI Moderation instead.
 * Fail-open on timeout/API errors so generation is not blocked when
 * moderation is unavailable. Fail-closed when content is clearly flagged.
 */

import { getReplicateClient } from "./replicate";

export const MODERATION_TIMEOUT_MS = 3_000;
/** Replicate cold starts can exceed 3s; keep image checks a bit more patient. */
export const IMAGE_MODERATION_TIMEOUT_MS = 20_000;
export const MODERATION_SCORE_THRESHOLD = 0.5;

/** Friendly user-facing message — never reveal specific violation categories. */
export const CONTENT_REJECTED_MESSAGE =
  "Your request could not be processed because it violates our content policy. Credits used for rejected or removed content are non-refundable.";

/** Pinned Replicate NSFW classifier (binary: normal | nsfw). */
export const NSFW_IMAGE_MODEL =
  "falcons-ai/nsfw_image_detection:97116600cabd3037e5f22ca08ffcc33b92cfacebf7ccd3609e9c1d29e43d3a8d";

export interface ModerationResult {
  passed: boolean;
  /** Internal-only detail for logs / Redis — never show to end users. */
  reason?: string;
}

export type ModerationProvider = "replicate" | "openai" | "auto";

interface ModerationCategoryScores {
  [category: string]: number | undefined;
}

interface ModerationApiResult {
  flagged?: boolean;
  categories?: Record<string, boolean | undefined>;
  category_scores?: ModerationCategoryScores;
}

interface ModerationApiResponse {
  results?: ModerationApiResult[];
}

type OpenAiModerationInput =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

/** Lightweight denylist for server-side / future custom prompts (no paid API). */
const TEXT_BLOCKLIST = [
  "nsfw",
  "porn",
  "pornography",
  "nude",
  "nudity",
  "naked",
  "xxx",
  "onlyfans",
  "hentai",
  "erotic",
  "sexually explicit",
  "child porn",
  "child sexual",
  "csam",
  "裸体",
  "色情",
  "成人内容",
  "色情片",
];

function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

function getReplicateToken(): string | null {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  return token || null;
}

export function getModerationProvider(): ModerationProvider {
  const raw = (process.env.MODERATION_PROVIDER || "replicate").trim().toLowerCase();
  if (raw === "openai" || raw === "auto" || raw === "replicate") {
    return raw;
  }
  return "replicate";
}

function exceedsScoreThreshold(scores: ModerationCategoryScores | undefined): boolean {
  if (!scores) return false;
  return Object.values(scores).some(
    (score) => typeof score === "number" && score > MODERATION_SCORE_THRESHOLD
  );
}

function evaluateOpenAiResult(
  result: ModerationApiResult | undefined
): ModerationResult {
  if (!result) {
    return { passed: true, reason: "empty_moderation_result" };
  }

  const flagged = result.flagged === true;
  const highScore = exceedsScoreThreshold(result.category_scores);

  if (flagged || highScore) {
    const flaggedCategories = Object.entries(result.categories ?? {})
      .filter(([, value]) => value === true)
      .map(([key]) => key);

    return {
      passed: false,
      reason: flagged
        ? `flagged:${flaggedCategories.join(",") || "unknown"}`
        : `score_over_${MODERATION_SCORE_THRESHOLD}`,
    };
  }

  return { passed: true };
}

async function callOpenAiModeration(
  input: OpenAiModerationInput,
  model: string
): Promise<ModerationResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return { passed: true, reason: "missing_openai_api_key" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[moderation] OpenAI API error ${response.status}: ${body.slice(0, 500)}`
      );
      return { passed: true, reason: `api_error_${response.status}` };
    }

    const data = (await response.json()) as ModerationApiResponse;
    return evaluateOpenAiResult(data.results?.[0]);
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || /timeout/i.test(error.message));

    console.error(
      `[moderation] OpenAI ${isTimeout ? "timeout" : "request_failed"}:`,
      error
    );
    return {
      passed: true,
      reason: isTimeout ? "moderation_timeout" : "moderation_request_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(`Moderation timeout after ${timeoutMs}ms`);
      error.name = "AbortError";
      reject(error);
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeNsfwOutput(output: unknown): string {
  if (typeof output === "string") return output.toLowerCase().trim();
  if (Array.isArray(output) && output.length > 0) {
    return String(output[0]).toLowerCase().trim();
  }
  if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (typeof obj.label === "string") return obj.label.toLowerCase().trim();
    if (typeof obj.output === "string") return obj.output.toLowerCase().trim();
    if (typeof obj.prediction === "string") {
      return obj.prediction.toLowerCase().trim();
    }
  }
  return String(output ?? "").toLowerCase().trim();
}

async function checkImageWithReplicate(imageUrl: string): Promise<ModerationResult> {
  if (!getReplicateToken()) {
    console.error(
      "[moderation] REPLICATE_API_TOKEN is not set — skipping image moderation (fail-open)"
    );
    return { passed: true, reason: "missing_replicate_api_token" };
  }

  try {
    const client = getReplicateClient();
    const output = await withTimeout(
      client.run(NSFW_IMAGE_MODEL, { input: { image: imageUrl } }),
      IMAGE_MODERATION_TIMEOUT_MS
    );

    const label = normalizeNsfwOutput(output);
    if (label.includes("nsfw") || label === "unsafe" || label === "explicit") {
      return { passed: false, reason: `replicate_nsfw:${label}` };
    }

    return { passed: true, reason: `replicate:${label || "normal"}` };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || /timeout/i.test(error.message));

    console.error(
      `[moderation] Replicate ${isTimeout ? "timeout" : "request_failed"}:`,
      error
    );
    return {
      passed: true,
      reason: isTimeout
        ? "replicate_moderation_timeout"
        : "replicate_moderation_request_failed",
    };
  }
}

async function checkImageWithOpenAi(imageUrl: string): Promise<ModerationResult> {
  return callOpenAiModeration(
    [{ type: "image_url", image_url: { url: imageUrl } }],
    "omni-moderation-latest"
  );
}

/**
 * Moderate user / system text prompts before generation.
 * Uses a local denylist (no OpenAI card required). Optional OpenAI path if
 * MODERATION_PROVIDER=openai|auto and OPENAI_API_KEY is set.
 */
export async function checkText(prompt: string): Promise<ModerationResult> {
  const trimmed = prompt?.trim();
  if (!trimmed) {
    return { passed: true };
  }

  const lower = trimmed.toLowerCase();
  const hit = TEXT_BLOCKLIST.find((term) => lower.includes(term.toLowerCase()));
  if (hit) {
    return { passed: false, reason: `text_blocklist:${hit}` };
  }

  const provider = getModerationProvider();
  if (
    (provider === "openai" || provider === "auto") &&
    getOpenAiApiKey()
  ) {
    return callOpenAiModeration(trimmed, "omni-moderation-latest");
  }

  return { passed: true, reason: "text_blocklist_clear" };
}

/**
 * Moderate an image by public URL.
 * Default: Replicate NSFW classifier. Set MODERATION_PROVIDER=openai to force OpenAI.
 */
export async function checkImage(imageUrl: string): Promise<ModerationResult> {
  const url = imageUrl?.trim();
  if (!url) {
    return { passed: true, reason: "empty_image_url" };
  }

  const provider = getModerationProvider();

  if (provider === "openai") {
    const result = await checkImageWithOpenAi(url);
    if (result.reason === "missing_openai_api_key") {
      console.error(
        "[moderation] OPENAI_API_KEY missing with provider=openai — fail-open"
      );
    }
    return result;
  }

  if (provider === "auto" && getOpenAiApiKey()) {
    const openaiResult = await checkImageWithOpenAi(url);
    if (
      openaiResult.reason !== "missing_openai_api_key" &&
      !openaiResult.reason?.startsWith("api_error_") &&
      openaiResult.reason !== "moderation_timeout" &&
      openaiResult.reason !== "moderation_request_failed"
    ) {
      return openaiResult;
    }
    // Fall through to Replicate on OpenAI billing/API failures.
  }

  return checkImageWithReplicate(url);
}
