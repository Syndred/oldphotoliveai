// File validation and storage key generation
// Requirements: 2.1, 2.2, 2.4

import { v4 as uuidv4 } from "uuid";

// ── Constants ───────────────────────────────────────────────────────────────

export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_STORAGE_KEY_LENGTH = 512;

// ── Validation ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an uploaded file's type and size.
 * - Supported types: JPEG, PNG, WebP
 * - Max size: 10MB
 */
export function validateFile(file: File): ValidationResult {
  if (!SUPPORTED_MIME_TYPES.includes(file.type as typeof SUPPORTED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: "fileTypeNotSupported",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "fileTooLarge",
    };
  }

  return { valid: true };
}

// ── Storage Key Generation ──────────────────────────────────────────────────

/**
 * Extracts the file extension from a filename (including the dot).
 * Returns empty string if no extension found.
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }
  return filename.slice(lastDot);
}

/**
 * Generates a unique R2 storage key for an uploaded file.
 * Format: tasks/{uuid}/original{ext}
 * We intentionally avoid using the raw user filename in object keys.
 */
export function generateStorageKey(filename: string): string {
  const id = uuidv4();
  const ext = getFileExtension(filename)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
  return `tasks/${id}/original${safeExt}`;
}

/**
 * Validate task image key coming from client before creating a task.
 * This blocks URL injection and obvious path traversal payloads.
 */
export function isSafeTaskStorageKey(key: string): boolean {
  const normalized = key.trim();
  if (!normalized || normalized.length > MAX_STORAGE_KEY_LENGTH) {
    return false;
  }

  if (!normalized.startsWith("tasks/")) {
    return false;
  }

  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\")
  ) {
    return false;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return false;
  }

  // Keep key URL-safe and storage-friendly.
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(normalized)) {
    return false;
  }

  return true;
}
