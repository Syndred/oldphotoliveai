import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { config } from "@/lib/config";
import { getS3Client, deleteFromR2 } from "@/lib/r2";
import { createAuthenticatedTaskAtomic } from "@/lib/task-creation";
import type { Task, User } from "@/types";

/** A separate source object makes either task safe to delete independently. */
export async function createTaskUpgrade(user: User, source: Task) {
  const extension = source.originalImageKey.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] ?? ".jpg";
  const imageKey = `tasks/${uuidv4()}/original${extension.toLowerCase()}`;
  await getS3Client().send(new CopyObjectCommand({
    Bucket: config.r2.bucketName,
    CopySource: `${config.r2.bucketName}/${source.originalImageKey.split("/").map(encodeURIComponent).join("/")}`,
    Key: imageKey,
  }));

  // If EVAL times out, it may already have committed. Keep the source in that
  // ambiguous case rather than deleting the input of a paid, queued task.
  const result = await createAuthenticatedTaskAtomic({
    user,
    imageKey,
    workflow: source.workflow ?? "full",
    upgradeSourceTaskId: source.id,
  });
  if (result.outcome !== "created") {
    // A cleanup failure must not turn a confirmed replay into an error/retry.
    await deleteFromR2(imageKey).catch(() => undefined);
  }
  return result;
}
