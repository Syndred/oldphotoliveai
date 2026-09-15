import type {
  Task,
  TaskFailureCode,
  TaskFailureStage,
  TaskStatus,
  TaskWorkflow,
} from "@/types";
import type { TaskAccessMode } from "@/lib/task-access";

const FAILURE_CODES = new Set<NonNullable<TaskFailureCode>>([
  "content_rejected",
  "source_unreachable",
  "service_busy",
  "provider_auth",
  "provider_config",
  "download_failed",
  "processing_failed",
]);
const FAILURE_STAGES = new Set<NonNullable<TaskFailureStage>>([
  "restoring",
  "colorizing",
  "animating",
]);

export interface PublicTaskStatus {
  [key: string]: unknown;
  status: TaskStatus;
  progress: number;
  workflow: TaskWorkflow;
  accessMode: TaskAccessMode;
  attemptCount: number;
  retryAllowed: boolean;
  errorMessage?: string;
  failureCode?: TaskFailureCode;
  failureStage?: NonNullable<TaskFailureStage>;
  originalImageKey?: string;
  restoredImageKey?: string;
  colorizedImageKey?: string;
  animationVideoKey?: string;
}

/**
 * Produce the only task shape exposed by status transports. Internal provider
 * errors and policy flags deliberately never cross this boundary.
 */
export function toPublicTaskStatus(
  task: Task,
  accessMode: TaskAccessMode
): PublicTaskStatus {
  const attemptCount = Number.isFinite(task.attemptCount)
    ? Math.max(1, Math.floor(task.attemptCount as number))
    : 1;
  const response: PublicTaskStatus = {
    status: task.status,
    progress: task.progress,
    workflow: task.workflow ?? "full",
    accessMode,
    attemptCount,
    retryAllowed: task.status === "failed" && task.violation !== true,
  };

  if (typeof task.errorMessage === "string" && task.errorMessage) {
    response.errorMessage = task.errorMessage;
  }
  if (task.failureCode && FAILURE_CODES.has(task.failureCode)) {
    response.failureCode = task.failureCode;
  }
  if (task.failureStage && FAILURE_STAGES.has(task.failureStage)) {
    response.failureStage = task.failureStage;
  }

  for (const key of [
    "originalImageKey",
    "restoredImageKey",
    "colorizedImageKey",
    "animationVideoKey",
  ] as const) {
    if (typeof task[key] === "string" && task[key]) {
      response[key] = task[key];
    }
  }

  return response;
}
