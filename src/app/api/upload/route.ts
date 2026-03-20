// Upload API Route
// Requirements: 2.1, 2.2, 2.3, 2.5, 11.1, 18.5

import { NextRequest, NextResponse } from "next/server";
import { validateFile, generateStorageKey } from "@/lib/validation";
import { uploadToR2 } from "@/lib/r2";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

type UploadErrorKey =
  | "uploadFailed"
  | "uploadStorageConfigError"
  | "uploadStorageAuthError"
  | "uploadStorageBucketMissing"
  | "uploadStorageNetworkError";

interface UploadErrorClassification {
  status: number;
  errorKey: UploadErrorKey;
  errorCode:
    | "R2_CONFIG_ERROR"
    | "R2_AUTH_ERROR"
    | "R2_BUCKET_NOT_FOUND"
    | "R2_NETWORK_ERROR"
    | "R2_UNKNOWN_ERROR";
}

function includesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function classifyUploadError(error: unknown): UploadErrorClassification {
  const err = error as {
    name?: unknown;
    message?: unknown;
    Code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  const name = typeof err?.name === "string" ? err.name : "";
  const message = typeof err?.message === "string" ? err.message : "";
  const serviceCode = typeof err?.Code === "string" ? err.Code : "";
  const httpStatusCode =
    typeof err?.$metadata?.httpStatusCode === "number"
      ? err.$metadata.httpStatusCode
      : null;
  const combined = `${name} ${serviceCode} ${message}`.toLowerCase();

  if (
    includesAny(combined, [
      "missing required environment variables",
      "r2_",
      "endpoint",
      "invalid endpoint",
    ])
  ) {
    return {
      status: 500,
      errorKey: "uploadStorageConfigError",
      errorCode: "R2_CONFIG_ERROR",
    };
  }

  if (
    includesAny(combined, [
      "accessdenied",
      "invalidaccesskeyid",
      "signaturedoesnotmatch",
      "credentialsprovidererror",
      "invalid token",
      "forbidden",
      "authorization",
    ]) ||
    httpStatusCode === 401 ||
    httpStatusCode === 403
  ) {
    return {
      status: 500,
      errorKey: "uploadStorageAuthError",
      errorCode: "R2_AUTH_ERROR",
    };
  }

  if (
    includesAny(combined, [
      "nosuchbucket",
      "the specified bucket does not exist",
      "bucket not found",
    ]) ||
    httpStatusCode === 404
  ) {
    return {
      status: 500,
      errorKey: "uploadStorageBucketMissing",
      errorCode: "R2_BUCKET_NOT_FOUND",
    };
  }

  if (
    includesAny(combined, [
      "slowdown",
      "timeout",
      "timed out",
      "network",
      "econnreset",
      "econnrefused",
      "enotfound",
      "socket hang up",
      "fetch failed",
      "connection",
      "service unavailable",
      "internalerror",
    ]) ||
    httpStatusCode === 429 ||
    (httpStatusCode !== null && httpStatusCode >= 500)
  ) {
    return {
      status: 503,
      errorKey: "uploadStorageNetworkError",
      errorCode: "R2_NETWORK_ERROR",
    };
  }

  return {
    status: 500,
    errorKey: "uploadFailed",
    errorCode: "R2_UNKNOWN_ERROR",
  };
}

function buildRequestId(): string {
  return `upl_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    // 1. Check file exists and is a File instance
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: getErrorMessage("uploadFailed", locale) },
        { status: 400 }
      );
    }

    // 2. Validate file type and size
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: getErrorMessage(validation.error!, locale) },
        { status: 400 }
      );
    }

    // 3. Generate unique storage key
    const key = generateStorageKey(file.name);

    // 4. Convert File to Buffer and upload to R2
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadToR2(buffer, key, file.type);

    // 5. Return only the storage key so the browser never receives raw object URLs.
    return NextResponse.json({ key }, { status: 200 });
  } catch (error) {
    const classified = classifyUploadError(error);
    const requestId = buildRequestId();

    console.error("Upload failed:", {
      requestId,
      errorCode: classified.errorCode,
      errorKey: classified.errorKey,
      error,
    });

    return NextResponse.json(
      {
        error: getErrorMessage(classified.errorKey, locale),
        errorCode: classified.errorCode,
        requestId,
      },
      { status: classified.status }
    );
  }
}
