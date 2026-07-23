import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { Task } from "@/types";
import { getAnonymousVisitorId } from "@/lib/anonymous";
import { getAnonymousTaskOwnedByVisitor, getTaskOwnedByUser } from "@/lib/redis";

export type TaskAccessMode = "authenticated" | "anonymous";

export interface AccessibleTaskResult {
  task: Task;
  mode: TaskAccessMode;
}

export async function getAccessibleTask(
  request: NextRequest,
  taskId: string
): Promise<AccessibleTaskResult | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const userId = token?.userId as string | undefined;

  if (userId) {
    const task = await getTaskOwnedByUser(taskId, userId);
    if (task) {
      return { task, mode: "authenticated" };
    }
  }

  const visitorId = getAnonymousVisitorId(request);
  if (!visitorId) {
    return null;
  }

  const anonymousTask = await getAnonymousTaskOwnedByVisitor(taskId, visitorId);
  return anonymousTask ? { task: anonymousTask, mode: "anonymous" } : null;
}
