import { createHash } from "node:crypto";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockEval = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval }) }));
jest.mock("@/lib/r2", () => ({ deleteFromR2: (...args: unknown[]) => mockDelete(...args) }));
import { cleanupUploadedPhotos, CLAIM_UPLOAD_CLEANUP_SCRIPT, FINISH_UPLOAD_CLEANUP_SCRIPT, SELECT_UPLOAD_CLEANUP_SCRIPT, UPLOAD_CLEANUP_INDEX } from "@/lib/upload-cleanup";

let redis: RedisLuaFixture;
const oldTime = new Date(Date.now() - 8 * 86400000);
const cutoff = new Date(Date.now() - 7 * 86400000);
const imageKey = "uploads/original-1.jpg";
const receiptKey = (key = imageKey) => `upload:receipt:${createHash("sha256").update(key).digest("hex")}`;
const receipt = (key = imageKey) => JSON.parse(redis.getString(receiptKey(key))!);
function addUpload(key = imageKey, date = oldTime) {
  redis.setString(receiptKey(key), JSON.stringify({ imageKey: key, userId: "owner", createdAt: date.toISOString() }));
  redis.addSorted(UPLOAD_CLEANUP_INDEX, date.getTime(), key);
}
const claimArgs = (key = imageKey) => [key, String(cutoff.getTime()), cutoff.toISOString()];
beforeEach(() => {
  jest.resetAllMocks();
  redis = new RedisLuaFixture();
  addUpload();
  mockEval.mockImplementation((script, keys, args) => redis.eval(script, keys, args));
  mockDelete.mockResolvedValue(undefined);
});

it("locks an expired temporary receipt before deleting the exact object and clears both records only after success", async () => {
  mockDelete.mockImplementation(async key => {
    expect(key).toBe(imageKey);
    expect(receipt().cleanupPending).toBe(true);
    expect(redis.sortedMembers(UPLOAD_CLEANUP_INDEX)).toEqual([imageKey]);
  });
  expect(await cleanupUploadedPhotos()).toEqual({ checked: 1, deleted: 1, deferred: 0, skipped: 0 });
  expect(redis.getString(receiptKey())).toBeUndefined();
  expect(redis.sortedMembers(UPLOAD_CLEANUP_INDEX)).toEqual([]);
});

it("does not select fresh uploads and clamps even a large requested batch to three", async () => {
  addUpload("uploads/fresh.jpg", new Date());
  for (let i = 2; i <= 5; i++) addUpload(`uploads/original-${i}.jpg`);
  const result = await cleanupUploadedPhotos(999);
  expect(result).toMatchObject({ checked: 3, deleted: 3 });
  expect(mockDelete).toHaveBeenCalledTimes(3);
  expect(mockDelete).not.toHaveBeenCalledWith("uploads/fresh.jpg");
  expect(redis.getString(receiptKey("uploads/fresh.jpg"))).toBeDefined();
});

it("rechecks membership so a task that pins the source after selection wins over cleanup", async () => {
  mockEval.mockImplementation(async (script, keys, args) => {
    if (script === CLAIM_UPLOAD_CLEANUP_SCRIPT) redis.removeSorted(UPLOAD_CLEANUP_INDEX, imageKey);
    return redis.eval(script, keys, args);
  });
  expect(await cleanupUploadedPhotos()).toMatchObject({ deleted: 0, skipped: 1 });
  expect(mockDelete).not.toHaveBeenCalled();
  expect(receipt().cleanupPending).toBeUndefined();
});

it("a stale index without a receipt is removed without blindly deleting a potentially referenced legacy source", async () => {
  await redis.eval("return redis.call('DEL', KEYS[1])", [receiptKey()], []);
  expect(await cleanupUploadedPhotos()).toMatchObject({ skipped: 1, deleted: 0 });
  expect(mockDelete).not.toHaveBeenCalled();
  expect(redis.sortedMembers(UPLOAD_CLEANUP_INDEX)).toEqual([]);
});

it.each(["not-json", JSON.stringify({ imageKey: "different", createdAt: oldTime.toISOString() }), JSON.stringify({ imageKey, createdAt: "" })])("retains objects with malformed or mismatched receipts", async raw => {
  redis.setString(receiptKey(), raw);
  expect(await cleanupUploadedPhotos()).toMatchObject({ skipped: 1 });
  expect(mockDelete).not.toHaveBeenCalled();
  expect(redis.getString(receiptKey())).toBe(raw);
});

it("will not delete a recent receipt even if its index score is incorrectly old", async () => {
  redis.setString(receiptKey(), JSON.stringify({ imageKey, createdAt: new Date().toISOString() }));
  expect(await cleanupUploadedPhotos()).toMatchObject({ skipped: 1 });
  expect(mockDelete).not.toHaveBeenCalled();
});

it("retains cleanupPending and index after an R2 failure, then idempotently recovers", async () => {
  mockDelete.mockRejectedValueOnce(new Error("R2 network error"));
  expect(await cleanupUploadedPhotos()).toMatchObject({ deferred: 1, deleted: 0 });
  expect(receipt().cleanupPending).toBe(true);
  expect(redis.sortedMembers(UPLOAD_CLEANUP_INDEX)).toEqual([imageKey]);
  expect(await cleanupUploadedPhotos()).toMatchObject({ deleted: 1 });
  expect(mockDelete).toHaveBeenCalledTimes(2);
});

it("does not delete when a claim result is unknown, and recovers a claim that actually committed", async () => {
  let responseLost = false;
  mockEval.mockImplementation(async (script, keys, args) => {
    const result = await redis.eval(script, keys, args);
    if (!responseLost && script === CLAIM_UPLOAD_CLEANUP_SCRIPT) {
      responseLost = true;
      throw new Error("claim response lost");
    }
    return result;
  });
  expect(await cleanupUploadedPhotos()).toMatchObject({ deferred: 1 });
  expect(mockDelete).not.toHaveBeenCalled();
  expect(receipt().cleanupPending).toBe(true);
  expect(await cleanupUploadedPhotos()).toMatchObject({ deleted: 1 });
});

it("repeats only the same R2 deletion after finish did not commit", async () => {
  let finishFailed = false;
  mockEval.mockImplementation((script, keys, args) => {
    if (!finishFailed && script === FINISH_UPLOAD_CLEANUP_SCRIPT) {
      finishFailed = true;
      throw new Error("finish not sent");
    }
    return redis.eval(script, keys, args);
  });
  expect(await cleanupUploadedPhotos()).toMatchObject({ deferred: 1 });
  expect(receipt().cleanupPending).toBe(true);
  expect(await cleanupUploadedPhotos()).toMatchObject({ deleted: 1 });
  expect(mockDelete.mock.calls).toEqual([[imageKey], [imageKey]]);
});

it("does not resurrect cleanup records after a committed finish response was lost", async () => {
  mockEval.mockImplementation(async (script, keys, args) => {
    const result = await redis.eval(script, keys, args);
    if (script === FINISH_UPLOAD_CLEANUP_SCRIPT) throw new Error("finish response lost");
    return result;
  });
  expect(await cleanupUploadedPhotos()).toMatchObject({ deferred: 1 });
  expect(redis.getString(receiptKey())).toBeUndefined();
  expect(await cleanupUploadedPhotos()).toMatchObject({ checked: 0 });
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

it("handles two concurrent cleaners without changing a replacement receipt or any other object", async () => {
  await Promise.all([cleanupUploadedPhotos(), cleanupUploadedPhotos()]);
  expect(mockDelete.mock.calls.every(([key]) => key === imageKey)).toBe(true);
  expect(redis.sortedMembers(UPLOAD_CLEANUP_INDEX)).toEqual([]);
  expect(redis.getString(receiptKey())).toBeUndefined();
  addUpload(imageKey, new Date());
  expect(await redis.eval(FINISH_UPLOAD_CLEANUP_SCRIPT, [receiptKey(), UPLOAD_CLEANUP_INDEX], [imageKey, oldTime.toISOString()])).toBe("STALE_RECEIPT");
  expect(receipt().cleanupPending).toBeUndefined();
});

it("fails closed on wrong index types before any mutation or R2 deletion", async () => {
  redis = new RedisLuaFixture();
  redis.setString(UPLOAD_CLEANUP_INDEX, "wrong-type");
  redis.setString(receiptKey(), JSON.stringify({ imageKey, createdAt: oldTime.toISOString() }));
  await expect(cleanupUploadedPhotos()).rejects.toThrow("UPLOAD_CLEANUP_INDEX_UNAVAILABLE");
  expect(await redis.eval(CLAIM_UPLOAD_CLEANUP_SCRIPT, [receiptKey(), UPLOAD_CLEANUP_INDEX], claimArgs())).toEqual(["ERROR", "INVALID_INDEX"]);
  expect(await redis.eval(FINISH_UPLOAD_CLEANUP_SCRIPT, [receiptKey(), UPLOAD_CLEANUP_INDEX], [imageKey, oldTime.toISOString()])).toBe("INVALID_INDEX");
  expect(mockDelete).not.toHaveBeenCalled();
  expect(receipt().cleanupPending).toBeUndefined();
  expect(redis.getString(UPLOAD_CLEANUP_INDEX)).toBe("wrong-type");
});

it("makes no global scan/list request; an empty temporary index is a no-op", async () => {
  redis = new RedisLuaFixture();
  expect(await cleanupUploadedPhotos()).toEqual({ checked: 0, deleted: 0, deferred: 0, skipped: 0 });
  expect(mockEval).toHaveBeenCalledWith(SELECT_UPLOAD_CLEANUP_SCRIPT, [UPLOAD_CLEANUP_INDEX], expect.any(Array));
  expect(mockDelete).not.toHaveBeenCalled();
});
