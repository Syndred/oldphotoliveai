import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";

type UploadOwner = { userId?: string | null; visitorId?: string | null };
type UploadReceipt = UploadOwner & { imageKey: string; createdAt: string };
const UPLOAD_RECEIPT_TTL = 7 * 24 * 60 * 60;

function receiptKey(imageKey: string): string {
  return `upload:receipt:${createHash("sha256").update(imageKey).digest("hex")}`;
}

/** Bind an uploaded object before returning its key to the browser. */
export async function registerUploadedPhoto(imageKey: string, owner: UploadOwner): Promise<void> {
  if (!owner.userId && !owner.visitorId) throw new Error("Upload owner is required");
  const receipt: UploadReceipt = {
    imageKey,
    userId: owner.userId || undefined,
    visitorId: owner.visitorId || undefined,
    createdAt: new Date().toISOString(),
  };
  await getRedisClient().set(receiptKey(imageKey), receipt, { ex: UPLOAD_RECEIPT_TTL, nx: true });
}

/** Guest uploads survive sign-in on the same browser; signed uploads stay account-bound. */
export async function isUploadOwned(imageKey: string, owner: UploadOwner): Promise<boolean> {
  const receipt = await getRedisClient().get<UploadReceipt>(receiptKey(imageKey));
  if (!receipt || receipt.imageKey !== imageKey) return false;
  if (receipt.userId) return Boolean(owner.userId && receipt.userId === owner.userId);
  return Boolean(owner.visitorId && receipt.visitorId === owner.visitorId);
}
