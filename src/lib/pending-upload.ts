import type { TaskWorkflow } from "@/types";

const KEY = "opla:pending-upload:v1";
const MAX_AGE = 24 * 60 * 60 * 1000;
export interface PendingUpload {
  imageKey: string;
  workflow: TaskWorkflow;
  pathname: string;
  userId: string;
  savedAt: number;
}

export function savePendingUpload(upload: Omit<PendingUpload, "savedAt">): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...upload, savedAt: Date.now() }));
  } catch { /* The current page still retains the upload when storage is unavailable. */ }
}

export function readPendingUpload(userId: string, pathname: string, workflow: TaskWorkflow): PendingUpload | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null") as PendingUpload | null;
    if (!value) return null;
    if (!Number.isFinite(value.savedAt) || Date.now() - value.savedAt > MAX_AGE) {
      clearPendingUpload();
      return null;
    }
    if (!userId || value.userId !== userId || value.pathname !== pathname || value.workflow !== workflow || typeof value.imageKey !== "string") return null;
    return value;
  } catch { return null; }
}

export function clearPendingUpload(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* Storage is optional. */ }
}
