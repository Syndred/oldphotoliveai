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
  task: (taskId: string) => `task:${taskId}`,
  userTasks: (userId: string) => `user:${userId}:tasks`,
};

// ── User Operations ─────────────────────────────────────────────────────────

export async function createOrGetUser(
  googleId: string,
  email: string,
  name: string
): Promise<User> {
  const redis = getRedisClient();

  // Check if user already exists via Google ID index
  const existingUserId = await redis.get<string>(keys.userGoogle(googleId));

  if (existingUserId) {
    const existing = await redis.get<string>(keys.user(existingUserId));
    if (existing) {
      return JSON.parse(existing) as User;
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
  await redis.set(keys.user(user.id), JSON.stringify(user));
  await redis.set(keys.userGoogle(googleId), user.id);

  return user;
}

export async function getUser(userId: string): Promise<User | null> {
  const redis = getRedisClient();
  const data = await redis.get<string>(keys.user(userId));
  if (!data) return null;
  return JSON.parse(data) as User;
}

export async function updateUserTier(
  userId: string,
  tier: UserTier
): Promise<void> {
  const redis = getRedisClient();
  const data = await redis.get<string>(keys.user(userId));
  if (!data) {
    throw new Error(`User not found: ${userId}`);
  }

  const user = JSON.parse(data) as User;
  user.tier = tier;
  user.updatedAt = new Date().toISOString();

  await redis.set(keys.user(userId), JSON.stringify(user));
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
  await redis.set(keys.task(task.id), JSON.stringify(task));

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
  const existing = await redis.get<string>(keys.task(taskId));
  if (!existing) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const task = JSON.parse(existing) as Task;
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

  await redis.set(keys.task(taskId), JSON.stringify(task));
}

export async function getTask(taskId: string): Promise<Task | null> {
  const redis = getRedisClient();
  const data = await redis.get<string>(keys.task(taskId));
  if (!data) return null;
  return JSON.parse(data) as Task;
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
    const data = await redis.get<string>(keys.task(taskId));
    if (data) {
      tasks.push(JSON.parse(data) as Task);
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
  const data = await redis.get<string>(keys.task(taskId));
  if (!data) return false;

  const task = JSON.parse(data) as Task;

  // Only allow cancellation of pending or queued tasks
  if (task.status !== "pending" && task.status !== "queued") {
    return false;
  }

  task.status = "cancelled";
  // Keep current progress (cancelled preserves progress)
  await redis.set(keys.task(taskId), JSON.stringify(task));

  return true;
}

export async function retryTask(taskId: string): Promise<Task> {
  const redis = getRedisClient();
  const data = await redis.get<string>(keys.task(taskId));
  if (!data) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const task = JSON.parse(data) as Task;

  // Only allow retry of failed tasks
  if (task.status !== "failed") {
    throw new Error(`Task ${taskId} is not in failed status, cannot retry`);
  }

  // Reset to queued status
  task.status = "queued";
  task.progress = STATUS_PROGRESS_MAP.queued;
  task.errorMessage = null;
  task.completedAt = null;

  await redis.set(keys.task(taskId), JSON.stringify(task));

  return task;
}
