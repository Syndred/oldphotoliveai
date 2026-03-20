import type { Task } from "@/types";

export const TASK_ASSET_KINDS = [
  "original",
  "restored",
  "colorized",
  "animation",
] as const;

export type TaskAssetKind = (typeof TASK_ASSET_KINDS)[number];

export function isTaskAssetKind(value: string): value is TaskAssetKind {
  return (TASK_ASSET_KINDS as readonly string[]).includes(value);
}

export function resolveTaskAssetKey(
  task: Task,
  kind: TaskAssetKind
): string | null {
  switch (kind) {
    case "original":
      return task.originalImageKey;
    case "restored":
      return task.restoredImageKey;
    case "colorized":
      return task.colorizedImageKey;
    case "animation":
      return task.animationVideoKey;
    default:
      return null;
  }
}

export function buildTaskAssetUrl(
  taskId: string,
  kind: TaskAssetKind,
  options: { download?: boolean } = {}
): string {
  const params = new URLSearchParams({ kind });
  if (options.download) {
    params.set("download", "1");
  }

  return `/api/tasks/${encodeURIComponent(taskId)}/asset?${params.toString()}`;
}

export function getTaskAssetFilename(kind: TaskAssetKind): string {
  switch (kind) {
    case "original":
      return "original-photo.jpg";
    case "restored":
      return "restored-photo.jpg";
    case "colorized":
      return "colorized-photo.jpg";
    case "animation":
      return "animated-photo.mp4";
    default:
      return "download";
  }
}
