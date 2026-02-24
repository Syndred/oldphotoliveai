// ============================================================
// User Types
// ============================================================

export type UserTier = "free" | "pay_as_you_go" | "professional";

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  tier: UserTier;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Task Types
// ============================================================

export type TaskStatus =
  | "pending"
  | "queued"
  | "restoring"
  | "colorizing"
  | "animating"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskPriority = "normal" | "high";

export interface Task {
  id: string;
  userId: string;
  status: TaskStatus;
  priority: TaskPriority;
  originalImageKey: string;
  restoredImageKey: string | null;
  colorizedImageKey: string | null;
  animationVideoKey: string | null;
  errorMessage: string | null;
  progress: number;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateTaskInput {
  userId: string;
  originalImageKey: string;
  priority: TaskPriority;
}

// ============================================================
// Quota Types
// ============================================================

export interface QuotaInfo {
  userId: string;
  tier: UserTier;
  remaining: number;
  dailyLimit: number | null;
  resetAt: string | null;
  credits: number;
  creditsExpireAt: string | null;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

// ============================================================
// Rate Limit Types
// ============================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export type RateLimitType = "api" | "upload";

// ============================================================
// Constants
// ============================================================

export const RESOLUTION_CONFIG = {
  free: { maxWidth: 800, maxHeight: 600, videoQuality: "720p" },
  paid: { maxWidth: 1920, maxHeight: 1080, videoQuality: "1080p" },
} as const;

export const RATE_LIMITS = {
  api: { maxRequests: 100, windowMs: 3_600_000 },
  upload: { maxRequests: 10, windowMs: 3_600_000 },
} as const;

export const PRIORITY_WEIGHTS = {
  high: 0,
  normal: 1_000_000_000_000_000,
} as const;

export const ANIMATION_PARAMS = {
  motion_bucket_id: 1,
  fps: 24,
  duration: 4,
  output_format: "mp4",
} as const;

// ============================================================
// Progress Mapping
// ============================================================

export const STATUS_PROGRESS_MAP: Record<TaskStatus, number> = {
  pending: 0,
  queued: 5,
  restoring: 25,
  colorizing: 50,
  animating: 75,
  completed: 100,
  failed: -1,
  cancelled: -1,
} as const;
