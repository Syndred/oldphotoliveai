import { CONTENT_REJECTED_MESSAGE } from "@/lib/moderation";
import type { TaskFailureCode } from "@/types";

export interface PipelineFailureClassification {
  errorMessage: string;
  failureCode: TaskFailureCode;
  violation: boolean;
}

export function classifyPipelineFailure(
  rawMessage: string,
  options: { isViolation?: boolean; isSpendLimit?: boolean } = {}
): PipelineFailureClassification {
  if (options.isViolation) {
    return {
      errorMessage: CONTENT_REJECTED_MESSAGE,
      failureCode: "content_rejected",
      violation: true,
    };
  }
  if (rawMessage.startsWith("SOURCE_IMAGE_UNREACHABLE:")) {
    return {
      errorMessage: "The uploaded source image is no longer available. Please re-upload it and try again.",
      failureCode: "source_unreachable",
      violation: false,
    };
  }
  if (/Failed to download|Download timeout|^DOWNLOAD_TOO_LARGE:/i.test(rawMessage)) {
    return {
      errorMessage: "A generated file could not be retrieved. Please try again.",
      failureCode: "download_failed",
      violation: false,
    };
  }
  if (
    options.isSpendLimit ||
    rawMessage.includes("429") ||
    /throttled|rate limit/i.test(rawMessage)
  ) {
    return {
      errorMessage: "Service is temporarily busy. Please try again in a moment.",
      failureCode: "service_busy",
      violation: false,
    };
  }
  if (/401|Unauthenticated|authentication token/i.test(rawMessage)) {
    return {
      errorMessage: "AI service authentication is unavailable. Please contact support.",
      failureCode: "provider_auth",
      violation: false,
    };
  }
  if (/422|Invalid version|model configuration/i.test(rawMessage)) {
    return {
      errorMessage: "AI model configuration is unavailable. Please contact support.",
      failureCode: "provider_config",
      violation: false,
    };
  }
  return {
    errorMessage: "Processing failed. Please try again.",
    failureCode: "processing_failed",
    violation: false,
  };
}
