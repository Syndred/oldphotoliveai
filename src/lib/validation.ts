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
      error: "请上传 JPEG、PNG 或 WebP 格式的图片",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "文件大小不能超过 10MB",
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
 * Format: tasks/{uuid}/{original-filename}
 */
export function generateStorageKey(filename: string): string {
  const id = uuidv4();
  return `tasks/${id}/${filename}`;
}
