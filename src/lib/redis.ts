// Redis client and data operations
// Requirements: 1.3, 4.1, 4.2, 4.4, 4.5, 4.6, 4.7

import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";
import type {
  User,
  UserTier,
  Task,
  TaskStatus,
  CreateTaskInput,
} from "@/types";
import { STATUS_PROGRESS_MAP } from "@/types";

// ── Redis Client ────────────────────────────────────────────────────────────

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    });
  }
  return redisInstance;
}

// ── Key Helpers ─────────────────────────────────────────────────────────────

const keys = {
  user: (userId: string) => `user:${userId}`,
  userGoogle: (googleId: string) => `user:google:${googleId}`,
  userEmail: (email: string) => `user:email:${email}`,
  task: (taskId: string) => `task:${taskId}`,
  userTasks: (userId: string) => `user:${userId}:tasks`,
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── User Operations ─────────────────────────────────────────────────────────

export async function createOrGetUser(
  googleId: string,
  email: string,
  name: string
): Promise<User> {
  const redis = getRedisClient();
  const normalizedEmail = normalizeEmail(email);

  // Check if user already exists via Google ID index
  const existingUserId = await redis.get<string>(keys.userGoogle(googleId));

  if (existingUserId) {
    const existing = await redis.get<User>(keys.user(existingUserId));
    if (existing) {
      // Keep email index in sync for lookups by email
      await redis.set(keys.userEmail(normalizedEmail), existing.id);
      return existing;
    }
  }

  // Create new user
  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    googleId,
    email,
    name,
    avatarUrl: null,
    tier: "free",
    createdAt: now,
    updatedAt: now,
  };

  // Store user data and Google ID index
  await redis.set(keys.user(user.id), user);
  await redis.set(keys.userGoogle(googleId), user.id);
  await redis.set(keys.userEmail(normalizedEmail), user.id);

  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const redis = getRedisClient();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  // Fast path: direct email index
  const indexedUserId = await redis.get<string>(keys.userEmail(normalizedEmail));
  if (indexedUserId) {
    const indexedUser = await redis.get<User>(keys.user(indexedUserId));
    if (indexedUser) return indexedUser;
  }

  // Fallback path for legacy data without email index
  let cursor = "0";
  do {
    const [nextCursor, userKeys] = await redis.scan(cursor, {
      match: "user:*",
      count: 100,
    });
    cursor = String(nextCursor);

    for (const key of userKeys) {
      // Only scan user objects like user:<uuid>; skip indexes and task sets
      const parts = key.split(":");
      if (parts.length !== 2 || parts[0] !== "user") continue;

      const candidate = await redis.get<User>(key);
      if (!candidate) continue;
      if (normalizeEmail(candidate.email) !== normalizedEmail) continue;

      await redis.set(keys.userEmail(normalizedEmail), candidate.id);
      return candidate;
    }
  } while (cursor !== "0");

  return null;
}

export async function getUser(userId: string): Promise<User | null> {
  const redis = getRedisClient();
  const data = await redis.get<User>(keys.user(userId));
  return data ?? null;
}

export async function updateUserTier(
  userId: string,
  tier: UserTier
): Promise<void> {
  const redis = getRedisClient();
  const user = await redis.get<User>(keys.user(userId));
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  user.tier = tier;
  user.updatedAt = new Date().toISOString();

  await redis.set(keys.user(userId), user);
}

// ── Task Operations ─────────────────────────────────────────────────────────

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const redis = getRedisClient();
  const now = new Date().toISOString();

  const task: Task = {
    id: uuidv4(),
    userId: input.userId,
    status: "pending",
    priority: input.priority,
    originalImageKey: input.originalImageKey,
    restoredImageKey: null,
    colorizedImageKey: null,
    animationVideoKey: null,
    errorMessage: null,
    progress: 0,
    createdAt: now,
    completedAt: null,
  };

  // Store task data
  await redis.set(keys.task(task.id), task);

  // Add to user's task sorted set (score = creation timestamp for ordering)
  await redis.zadd(keys.userTasks(input.userId), {
    score: new Date(now).getTime(),
    member: task.id,
  });

  return task;
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  data?: Partial<Task>
): Promise<void> {
  const redis = getRedisClient();
  const task = await redis.get<Task>(keys.task(taskId));
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  task.status = status;

  // Update progress from STATUS_PROGRESS_MAP (failed/cancelled keep current progress)
  const mappedProgress = STATUS_PROGRESS_MAP[status];
  if (mappedProgress >= 0) {
    task.progress = mappedProgress;
  }

  // Set completedAt when task completes
  if (status === "completed") {
    task.completedAt = new Date().toISOString();
  }

  // Merge any additional data
  if (data) {
    Object.assign(task, data);
  }

  await redis.set(keys.task(taskId), task);
}

export async function getTask(taskId: string): Promise<Task | null> {
  const redis = getRedisClient();
  const data = await redis.get<Task>(keys.task(taskId));
  return data ?? null;
}

export async function getTaskOwnedByUser(
  taskId: string,
  userId: string
): Promise<Task | null> {
  const task = await getTask(taskId);
  if (!task || task.userId !== userId) {
    return null;
  }
  return task;
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  const redis = getRedisClient();

  // Get all task IDs from sorted set (ordered by score ascending)
  const taskIds = await redis.zrange<string[]>(
    keys.userTasks(userId),
    0,
    -1
  );

  if (!taskIds || taskIds.length === 0) return [];

  // Fetch each task
  const tasks: Task[] = [];
  for (const taskId of taskIds) {
    const data = await redis.get<Task>(keys.task(taskId));
    if (data) {
      tasks.push(data);
    }
  }

  // Sort by createdAt descending (newest first)
  tasks.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return tasks;
}

export async function cancelTask(taskId: string): Promise<boolean> {
  const redis = getRedisClient();
  const task = await redis.get<Task>(keys.task(taskId));
  if (!task) return false;

  // Only allow cancellation of pending or queued tasks
  if (task.status !== "pending" && task.status !== "queued") {
    return false;
  }

  task.status = "cancelled";
  // Keep current progress (cancelled preserves progress)
  await redis.set(keys.task(taskId), task);

  return true;
}

export async function retryTask(taskId: string): Promise<Task> {
  const redis = getRedisClient();
  const task = await redis.get<Task>(keys.task(taskId));
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Only allow retry of failed tasks
  if (task.status !== "failed") {
    throw new Error(`Task ${taskId} is not in failed status, cannot retry`);
  }

  // Reset to queued status
  task.status = "queued";
  task.progress = STATUS_PROGRESS_MAP.queued;
  task.errorMessage = null;
  task.completedAt = null;

  await redis.set(keys.task(taskId), task);

  return task;
}

export async function deleteTask(taskId: string, userId: string): Promise<boolean> {
  const redis = getRedisClient();
  const task = await redis.get<Task>(keys.task(taskId));
  if (!task) return false;

  // Verify ownership
  if (task.userId !== userId) return false;

  // Remove task data and from user's sorted set
  await redis.del(keys.task(taskId));
  await redis.zrem(keys.userTasks(userId), taskId);

  return true;
}

/**
 * Delete a task regardless of ownership.
 * Intended for trusted worker-side cleanup jobs only.
 */
export async function hardDeleteTask(taskId: string): Promise<boolean> {
  const redis = getRedisClient();
  const task = await redis.get<Task>(keys.task(taskId));
  if (!task) return false;

  await redis.del(keys.task(taskId));
  await redis.zrem(keys.userTasks(task.userId), taskId);
  return true;
}
