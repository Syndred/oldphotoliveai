/**
 * OpenAI Moderation helpers (text + image).
 *
 * Fail-open on timeout/API errors so generation is not blocked when Moderation
 * is unavailable. Fail-closed when the model clearly flags content.
 */

export const MODERATION_TIMEOUT_MS = 3_000;
export const MODERATION_SCORE_THRESHOLD = 0.5;

/** Friendly user-facing message — never reveal specific violation categories. */
export const CONTENT_REJECTED_MESSAGE =
  "Your request could not be processed because it violates our content policy. Credits used for rejected or removed content are non-refundable.";

export interface ModerationResult {
  passed: boolean;
  /** Internal-only detail for logs / Redis — never show to end users. */
  reason?: string;
}

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

type ModerationInput =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

function exceedsScoreThreshold(scores: ModerationCategoryScores | undefined): boolean {
  if (!scores) return false;
  return Object.values(scores).some(
    (score) => typeof score === "number" && score > MODERATION_SCORE_THRESHOLD
  );
}

function evaluateResult(result: ModerationApiResult | undefined): ModerationResult {
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

async function callModerationApi(
  input: ModerationInput,
  model: string
): Promise<ModerationResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    console.error(
      "[moderation] OPENAI_API_KEY is not set — skipping moderation (fail-open)"
    );
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
        `[moderation] API error ${response.status}: ${body.slice(0, 500)}`
      );
      return { passed: true, reason: `api_error_${response.status}` };
    }

    const data = (await response.json()) as ModerationApiResponse;
    return evaluateResult(data.results?.[0]);
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || /timeout/i.test(error.message));

    console.error(
      `[moderation] ${isTimeout ? "timeout" : "request_failed"}:`,
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

/**
 * Moderate user / system text prompts before generation.
 */
export async function checkText(prompt: string): Promise<ModerationResult> {
  const trimmed = prompt?.trim();
  if (!trimmed) {
    return { passed: true };
  }

  return callModerationApi(trimmed, "omni-moderation-latest");
}

/**
 * Moderate an image by public URL (not base64) via omni-moderation-latest.
 */
export async function checkImage(imageUrl: string): Promise<ModerationResult> {
  const url = imageUrl?.trim();
  if (!url) {
    return { passed: true, reason: "empty_image_url" };
  }

  return callModerationApi(
    [{ type: "image_url", image_url: { url } }],
    "omni-moderation-latest"
  );
}
