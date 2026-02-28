type ErrorTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

function includesAny(raw: string, patterns: readonly string[]): boolean {
  const lower = raw.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

/**
 * Normalize backend task/pipeline errors into localized, user-friendly text.
 * Unknown messages are returned as-is to avoid hiding useful details.
 */
export function resolveTaskErrorMessage(
  rawMessage: string | null | undefined,
  tErrors: ErrorTranslator
): string {
  const message = (rawMessage ?? "").trim();
  if (!message) return tErrors("processingFailedGeneric");

  if (
    message.startsWith("SOURCE_IMAGE_UNREACHABLE:") ||
    includesAny(message, ["source image url is unreachable"])
  ) {
    return tErrors("sourceImageUnreachable");
  }

  if (
    includesAny(message, [
      "service is temporarily busy",
      "rate limit",
      "throttled",
      "429",
    ])
  ) {
    return tErrors("serviceBusy");
  }

  if (
    includesAny(message, ["ai model configuration error", "invalid version"])
  ) {
    return tErrors("modelConfigError");
  }

  if (
    includesAny(message, [
      "failed to download intermediate result",
      "failed to download from",
    ])
  ) {
    return tErrors("intermediateDownloadFailed");
  }

  if (includesAny(message, ["task not found", "user not found"])) {
    return tErrors("taskNotFound");
  }

  if (includesAny(message, ["processing failed"])) {
    return tErrors("processingFailedGeneric");
  }

  return message;
}

export type { ErrorTranslator };
