export interface TaskCreationErrorPayload {
  error?: string;
  code?: string;
  stage?: string;
  allowanceConsumed?: boolean | null;
}

export interface TaskCreationFailure {
  kind: "rejected" | "failed";
  failureCode:
    | "anonymous_trial_used"
    | "daily_quota_exhausted"
    | "no_credits"
    | "quota_not_initialized"
    | "invalid_input"
    | "rate_limited"
    | "unauthorized"
    | "internal_error"
    | "network_or_server";
  stage: "authorization" | "validation" | "creation";
  allowanceConsumed: boolean | null;
  retryable: boolean;
}

const REJECTION_CODES = new Map<string, TaskCreationFailure["failureCode"]>([
  ["ANONYMOUS_TRIAL_USED", "anonymous_trial_used"],
  ["DAILY_QUOTA_EXHAUSTED", "daily_quota_exhausted"],
  ["NO_CREDITS", "no_credits"],
  ["QUOTA_NOT_INITIALIZED", "quota_not_initialized"],
]);

export function classifyTaskCreationResponse(
  status: number,
  payload: TaskCreationErrorPayload | null
): TaskCreationFailure {
  const rejectionCode = payload?.code ? REJECTION_CODES.get(payload.code) : undefined;
  if (rejectionCode) {
    return {
      kind: "rejected",
      failureCode: rejectionCode,
      stage: "authorization",
      allowanceConsumed: payload?.allowanceConsumed === true,
      retryable: false,
    };
  }

  if (status === 400 || status === 401 || status === 429) {
    return {
      kind: "rejected",
      failureCode:
        status === 400 ? "invalid_input" : status === 401 ? "unauthorized" : "rate_limited",
      stage: status === 400 ? "validation" : "authorization",
      allowanceConsumed: payload?.allowanceConsumed === true,
      retryable: status === 429,
    };
  }

  return {
    kind: "failed",
    failureCode:
      status >= 500 && status !== 502 && status !== 503 && status !== 504
        ? "internal_error"
        : "network_or_server",
    stage: "creation",
    allowanceConsumed:
      typeof payload?.allowanceConsumed === "boolean"
        ? payload.allowanceConsumed
        : null,
    retryable: true,
  };
}
