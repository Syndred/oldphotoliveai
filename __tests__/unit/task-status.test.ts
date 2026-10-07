import { toPublicTaskStatus } from "@/lib/task-status";
import type { Task } from "@/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    userId: "user-1",
    status: "failed",
    priority: "normal",
    workflow: "restore",
    originalImageKey: "tasks/task-1/original.jpg",
    restoredImageKey: null,
    colorizedImageKey: null,
    animationVideoKey: null,
    errorMessage: "Manual review required",
    internalErrorMessage: "private provider detail",
    failureStage: "restoring",
    failureCode: "provider_creation_unknown",
    progress: 25,
    attemptCount: 1,
    createdAt: "2026-09-15T00:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

describe("public task status", () => {
  it("exposes ambiguous creation as manual-review and non-retryable", () => {
    expect(toPublicTaskStatus(makeTask(), "authenticated")).toMatchObject({
      status: "failed",
      failureCode: "provider_creation_unknown",
      retryAllowed: false,
      requiresManualReview: true,
    });
  });

  it("keeps ordinary failures retryable", () => {
    expect(
      toPublicTaskStatus(
        makeTask({ failureCode: "service_busy" }),
        "authenticated"
      )
    ).toMatchObject({ retryAllowed: true, requiresManualReview: false });
  });

  it("derives manual review from an unsafe marker even after a generic failure", () => {
    expect(
      toPublicTaskStatus(
        makeTask({
          failureCode: "processing_failed",
          providerInvocations: {
            restoring: {
              status: "provider_creation_started",
              modelKey: "restoration",
              updatedAt: "2026-09-15T00:00:00.000Z",
            },
          },
        }),
        "authenticated"
      )
    ).toMatchObject({ retryAllowed: false, requiresManualReview: true });
  });

  it("allows recovery when a prediction ID is durable", () => {
    expect(
      toPublicTaskStatus(
        makeTask({
          failureCode: "processing_failed",
          providerInvocations: {
            restoring: {
              status: "creation_unknown",
              modelKey: "restoration",
              predictionId: "prediction-known",
              updatedAt: "2026-09-15T00:00:00.000Z",
            },
          },
        }),
        "authenticated"
      )
    ).toMatchObject({ retryAllowed: true, requiresManualReview: false });
  });

  it("allows retry after a definitive rejection despite a stale start marker", () => {
    expect(
      toPublicTaskStatus(
        makeTask({
          failureCode: "provider_config",
          providerCreationDefinitivelyRejected: true,
          providerInvocations: {
            restoring: {
              status: "provider_creation_started",
              modelKey: "restoration",
              updatedAt: "2026-09-15T00:00:00.000Z",
            },
          },
        }),
        "authenticated"
      )
    ).toMatchObject({ retryAllowed: true, requiresManualReview: false });
  });
});

describe("upgrade status", () => {
  it("offers upgrades for completed anonymous/free results without exposing source IDs", () => {
    const status = toPublicTaskStatus(makeTask({ status: "completed", generationTier: "free" }), "anonymous");
    expect(status).toMatchObject({ generationTier: "free", canUpgrade: true, isUpgrade: false });
    expect(status).not.toHaveProperty("userId");
  });
  it("uses legacy task priority and never offers already-paid results again", () => {
    expect(toPublicTaskStatus(makeTask({ status: "completed", priority: "high", upgradeSourceTaskId: "source-private" }), "authenticated"))
      .toMatchObject({ generationTier: "pay_as_you_go", canUpgrade: false, isUpgrade: true });
    expect(toPublicTaskStatus(makeTask({ upgradeSourceTaskId: "source-private" }), "authenticated")).not.toHaveProperty("upgradeSourceTaskId");
  });
  it("does not offer blocked or unfinished results", () => {
    expect(toPublicTaskStatus(makeTask({ status: "completed", violation: true }), "authenticated").canUpgrade).toBe(false);
    expect(toPublicTaskStatus(makeTask({ status: "restoring" }), "authenticated").canUpgrade).toBe(false);
  });
});
