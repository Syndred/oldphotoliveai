import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";

type UploadOwner = { userId?: string | null; visitorId?: string | null };
type UploadReceipt = UploadOwner & { imageKey: string; createdAt: string; cleanupPending?: boolean };

export function uploadReceiptKey(imageKey: string): string {
  return `upload:receipt:${createHash("sha256").update(imageKey).digest("hex")}`;
}

export const REGISTER_UPLOADED_PHOTO_SCRIPT = `
local receiptType = redis.call('TYPE', KEYS[1]).ok
local queueType = redis.call('TYPE', KEYS[2]).ok
if (receiptType ~= 'none' and receiptType ~= 'string') or
   (queueType ~= 'none' and queueType ~= 'zset') then return 'INVALID_KEY' end
if redis.call('EXISTS', KEYS[1]) == 1 then return 'EXISTING' end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('ZADD', KEYS[2], ARGV[2], ARGV[3])
return 'REGISTERED'
`;

/** Bind an uploaded object before returning its key to the browser. */
export async function registerUploadedPhoto(imageKey: string, owner: UploadOwner): Promise<void> {
  if (!owner.userId && !owner.visitorId) throw new Error("Upload owner is required");
  const receipt: UploadReceipt = {
    imageKey,
    userId: owner.userId || undefined,
    visitorId: owner.visitorId || undefined,
    createdAt: new Date().toISOString(),
  };
  const result = await getRedisClient().eval(REGISTER_UPLOADED_PHOTO_SCRIPT,
    [uploadReceiptKey(imageKey), "upload:cleanup"],
    [JSON.stringify(receipt), String(Date.parse(receipt.createdAt)), imageKey]);
  if (result !== "REGISTERED") throw new Error("Upload receipt could not be registered");
}

/** Guest uploads survive sign-in on the same browser; signed uploads stay account-bound. */
export async function isUploadOwned(imageKey: string, owner: UploadOwner): Promise<boolean> {
  const receipt = await getRedisClient().get<UploadReceipt>(uploadReceiptKey(imageKey));
  if (!receipt || receipt.cleanupPending || receipt.imageKey !== imageKey ||
      !Number.isFinite(Date.parse(receipt.createdAt)) || Date.now() - Date.parse(receipt.createdAt) >= 7 * 86400000) return false;
  if (receipt.userId) return Boolean(owner.userId && receipt.userId === owner.userId);
  return Boolean(owner.visitorId && receipt.visitorId === owner.visitorId);
}
