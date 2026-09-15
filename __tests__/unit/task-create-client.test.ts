import { classifyTaskCreationResponse } from "@/lib/task-create-client";

describe("classifyTaskCreationResponse", () => {
  it("separates expected allowance refusals from technical failures", () => {
    expect(
      classifyTaskCreationResponse(403, {
        code: "DAILY_QUOTA_EXHAUSTED",
        stage: "authorization",
        allowanceConsumed: false,
      })
    ).toEqual({
      kind: "rejected",
      failureCode: "daily_quota_exhausted",
      stage: "authorization",
      allowanceConsumed: false,
      retryable: false,
    });
  });

  it("marks network and server failures retryable without guessing allowance use", () => {
    expect(classifyTaskCreationResponse(503, null)).toEqual({
      kind: "failed",
      failureCode: "network_or_server",
      stage: "creation",
      allowanceConsumed: null,
      retryable: true,
    });
  });

  it("bounds unknown server codes", () => {
    expect(
      classifyTaskCreationResponse(500, {
        code: "A_PRIVATE_DATABASE_ERROR",
        stage: "secret_stage",
        allowanceConsumed: true,
      })
    ).toEqual({
      kind: "failed",
      failureCode: "internal_error",
      stage: "creation",
      allowanceConsumed: true,
      retryable: true,
    });
  });
});
