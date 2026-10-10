import { getRedisClient } from "@/lib/redis";
import { deleteFromR2 } from "@/lib/r2";
import { uploadReceiptKey } from "@/lib/upload-receipt";

export const UPLOAD_CLEANUP_INDEX = "upload:cleanup";
const UPLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const SELECT_UPLOAD_CLEANUP_SCRIPT = `
local kind = redis.call('TYPE', KEYS[1]).ok
if kind ~= 'none' and kind ~= 'zset' then return {'ERROR', 'INVALID_INDEX'} end
local selected = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[2])
local result = {'OK'}
for _, member in ipairs(selected) do table.insert(result, member) end
return result
`;

// Task creation pins an upload by removing this index member in its own Lua
// transaction. Recheck membership before locking the receipt, so either that
// pin wins or cleanupPending prevents the task from using a deleting object.
export const CLAIM_UPLOAD_CLEANUP_SCRIPT = `
local kind = redis.call('TYPE', KEYS[2]).ok
if kind ~= 'none' and kind ~= 'zset' then return {'ERROR', 'INVALID_INDEX'} end
local score = redis.call('ZSCORE', KEYS[2], ARGV[1])
if score == false then return {'SKIPPED', 'PINNED_OR_REMOVED'} end
if tonumber(score) > tonumber(ARGV[2]) then return {'SKIPPED', 'NOT_EXPIRED'} end
local receiptType = redis.call('TYPE', KEYS[1]).ok
if receiptType == 'none' then
  redis.call('ZREM', KEYS[2], ARGV[1])
  return {'SKIPPED', 'RECEIPT_MISSING'}
end
if receiptType ~= 'string' then return {'ERROR', 'INVALID_RECEIPT_TYPE'} end
local ok, receipt = pcall(cjson.decode, redis.call('GET', KEYS[1]))
if not ok or type(receipt) ~= 'table' or receipt.imageKey ~= ARGV[1] or type(receipt.createdAt) ~= 'string' or string.len(receipt.createdAt) ~= 24 then
  -- Never guess ownership of an orphaned or malformed receipt. Retain the
  -- object for manual review, without letting it starve the bounded queue.
  redis.call('ZREM', KEYS[2], ARGV[1])
  return {'SKIPPED', 'INVALID_RECEIPT'}
end
if receipt.createdAt > ARGV[3] then return {'SKIPPED', 'NOT_EXPIRED'} end
if receipt.cleanupPending ~= true then
  receipt.cleanupPending = true
  redis.call('SET', KEYS[1], cjson.encode(receipt))
end
return {'CLAIMED', receipt.createdAt}
`;

export const FINISH_UPLOAD_CLEANUP_SCRIPT = `
local kind = redis.call('TYPE', KEYS[2]).ok
if kind ~= 'none' and kind ~= 'zset' then return 'INVALID_INDEX' end
local receiptType = redis.call('TYPE', KEYS[1]).ok
if receiptType == 'none' then
  redis.call('ZREM', KEYS[2], ARGV[1])
  return 'ALREADY_FINISHED'
end
if receiptType ~= 'string' then return 'INVALID_RECEIPT_TYPE' end
local ok, receipt = pcall(cjson.decode, redis.call('GET', KEYS[1]))
if not ok or receipt.imageKey ~= ARGV[1] or receipt.cleanupPending ~= true or receipt.createdAt ~= ARGV[2] then return 'STALE_RECEIPT' end
redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[2], ARGV[1])
return 'FINISHED'
`;

/** Only registered temporary uploads; no bucket listing or legacy-source guesses. */
export async function cleanupUploadedPhotos(limit = 3): Promise<{ checked: number; deleted: number; deferred: number; skipped: number }> {
  const redis = getRedisClient();
  const cutoff = new Date(Date.now() - UPLOAD_RETENTION_MS);
  const count = Number.isFinite(limit) ? Math.min(3, Math.max(1, Math.floor(limit))) : 3;
  const selected = await redis.eval(SELECT_UPLOAD_CLEANUP_SCRIPT, [UPLOAD_CLEANUP_INDEX], [String(cutoff.getTime()), String(count)]) as unknown[];
  if (!Array.isArray(selected) || selected[0] !== "OK") throw new Error("UPLOAD_CLEANUP_INDEX_UNAVAILABLE");
  const imageKeys = selected.slice(1).map(String);
  const result = { checked: imageKeys.length, deleted: 0, deferred: 0, skipped: 0 };
  for (const imageKey of imageKeys) {
    try {
      const keys = [uploadReceiptKey(imageKey), UPLOAD_CLEANUP_INDEX];
      const claim = await redis.eval(CLAIM_UPLOAD_CLEANUP_SCRIPT, keys,
        [imageKey, String(cutoff.getTime()), cutoff.toISOString()]) as unknown[];
      if (claim[0] === "SKIPPED") {
        result.skipped++;
        if (claim[1] === "RECEIPT_MISSING" || claim[1] === "INVALID_RECEIPT") {
          console.warn(JSON.stringify({ message: "upload_cleanup_orphan_retained", reason: claim[1] }));
        }
        continue;
      }
      if (claim[0] !== "CLAIMED") throw new Error("UPLOAD_CLEANUP_NOT_CLAIMED");
      await deleteFromR2(imageKey);
      const finished = await redis.eval(FINISH_UPLOAD_CLEANUP_SCRIPT, keys, [imageKey, String(claim[1])]);
      if (finished !== "FINISHED" && finished !== "ALREADY_FINISHED") throw new Error("UPLOAD_CLEANUP_NOT_FINISHED");
      result.deleted++;
    } catch {
      // A timeout may have committed a claim/deletion. Keep the receipt/index
      // for the next run; repeating deletion of the same object is idempotent.
      result.deferred++;
    }
  }
  return result;
}
