import type { Task } from "@/types";
import type Stripe from "stripe";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockEval = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();
const mockRetrieve = jest.fn();
const mockCreate = jest.fn();
const mockHead = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval, get: mockGet, del: mockDel }) }));
jest.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ checkout: { sessions: { retrieve: mockRetrieve, create: mockCreate } } }) }));
jest.mock("@/lib/r2", () => ({ headPrivateObjectFromR2: (...args: unknown[]) => mockHead(...args) }));
import { unlockTaskDownload, reserveTaskDownloadCheckout, saveTaskDownloadCheckoutSession, recoverTaskDownloadCheckoutSession, getTaskDownloadGrant, hasTaskDownloadAccess, beginTaskDownloadDeletion, releaseTaskDownloadDeletion, assertTaskDownloadMastersAvailable } from "@/lib/task-download";
import { fulfillPaidCheckout } from "@/lib/checkout-fulfillment";
let redis: RedisLuaFixture;
const task: Task = {
  id: "task-1", userId: "anonymous-1", status: "completed", priority: "normal", generationTier: "free", workflow: "full",
  downloadPolicy: "preview_v1", masterAssets: { restored: "private/restored.jpg", colorized: "private/colorized.jpg", animation: "private/video.mp4" },
  originalImageKey: "original.jpg", restoredImageKey: "preview/restored.jpg", colorizedImageKey: "preview/colorized.jpg", animationVideoKey: "preview/video.mp4",
  errorMessage: null, internalErrorMessage: null, failureStage: null, progress: 100, createdAt: "2026-10-07T00:00:00.000Z", completedAt: "2026-10-07T00:01:00.000Z",
};
const input = { userId: "buyer", taskId: task.id, ownerUserId: task.userId };
const params: Stripe.Checkout.SessionCreateParams = { mode: "payment", metadata: { product: "oldphotoliveai", userId: "buyer", plan: "single_photo", scope: "result", taskId: "task-1" } };
const reserve = () => reserveTaskDownloadCheckout({ ...input, params: structuredClone(params) });
const quota = () => JSON.parse(redis.getString("quota:buyer")!);
beforeEach(() => {
  jest.resetAllMocks();
  redis = new RedisLuaFixture();
  redis.setString("task:task-1", JSON.stringify(task));
  redis.setString("user:buyer", JSON.stringify({ id: "buyer", tier: "free" }));
  redis.setString("quota:buyer", JSON.stringify({ tier: "free", remaining: 0, credits: 1, creditsExpireAt: "2099-01-01T00:00:00.000Z" }));
  mockEval.mockImplementation((script, keys, args) => redis.eval(script, keys, args));
  mockGet.mockImplementation(async (key) => { const value = redis.getString(key); return value ? JSON.parse(value) : null; });
  mockDel.mockImplementation((key) => redis.eval("return redis.call('DEL', KEYS[1])", [key], []));
  mockHead.mockResolvedValue({ ContentLength: 100 });
});
it("debits the last credit once across concurrent unlocks and replays", async () => {
  const results = await Promise.all([unlockTaskDownload(input), unlockTaskDownload(input), unlockTaskDownload(input)]);
  expect(results.map(r => r.outcome).sort()).toEqual(["EXISTING", "EXISTING", "GRANTED"]);
  expect(quota().credits).toBe(0);
  expect(await getTaskDownloadGrant(task.id)).toMatchObject({ userId: "buyer", taskId: task.id, scope: "result", source: "credit", creditsDebited: 1 });
  expect(await hasTaskDownloadAccess(task.id, "buyer")).toBe(true);
  expect(await hasTaskDownloadAccess(task.id, "other")).toBe(false);
  expect(redis.sortedMembers("user:buyer:tasks")).toEqual([task.id]);
  expect(redis.sortedMembers("queue:tasks")).toEqual([]);
  expect(redis.getHash(`conversion:${new Date().toISOString().slice(0,10)}`)).toEqual({ credit_unlocks: 1 });
});
it("does not debit already paid generation or Professional access", async () => {
  redis.setString("user:buyer", JSON.stringify({ id: "buyer", tier: "professional" }));
  expect((await unlockTaskDownload(input)).outcome).toBe("GRANTED");
  expect(quota().credits).toBe(1);
  expect(await getTaskDownloadGrant(task.id)).toMatchObject({ source: "professional", creditsDebited: 0 });
  redis = new RedisLuaFixture();
  redis.setString("task:task-1", JSON.stringify({ ...task, generationTier: "pay_as_you_go" }));
  expect((await unlockTaskDownload(input)).outcome).toBe("INCLUDED");
});
it("rejects expired credits and leaves both grant and balance untouched", async () => {
  redis.setString("quota:buyer", JSON.stringify({ credits: 9, creditsExpireAt: "2020-01-01T00:00:00.000Z" }));
  expect(await unlockTaskDownload(input)).toMatchObject({ outcome: "REJECTED", code: "CREDITS_EXPIRED" });
  expect(quota().credits).toBe(9);
  expect(await getTaskDownloadGrant(task.id)).toBeNull();
});
it("reserves one task-global order and rejects another account plus competing credit debit", async () => {
  const [a,b] = await Promise.all([reserve(), reserve()]);
  if (a.outcome === "rejected" || b.outcome === "rejected") throw Error("expected reservations");
  expect(a.pending.orderId).toBe(b.pending.orderId);
  expect(await reserveTaskDownloadCheckout({ ...input, userId: "another", params })).toMatchObject({ outcome: "rejected", code: "CHECKOUT_PENDING" });
  expect(await unlockTaskDownload(input)).toMatchObject({ outcome: "REJECTED", code: "CHECKOUT_PENDING" });
  expect(quota().credits).toBe(1);
  expect(await beginTaskDownloadDeletion(task.id)).toBe(false);
});
it("fulfills one paid result, keeps free tier/quota unchanged, and writes history plus receipt exactly once", async () => {
  const order = await reserve();
  if (order.outcome === "rejected") throw Error(order.code);
  const session = { id: "cs_single", payment_status: "paid", amount_total: 199, currency: "usd", metadata: order.pending.params.metadata } as unknown as Stripe.Checkout.Session;
  await saveTaskDownloadCheckoutSession(order.pending, session.id);
  expect((await Promise.all([fulfillPaidCheckout(session), fulfillPaidCheckout(session)])).filter(Boolean)).toHaveLength(1);
  expect(quota()).toMatchObject({ tier: "free", remaining: 0, credits: 1 });
  expect(JSON.parse(redis.getString("user:buyer")!).tier).toBe("free");
  expect(await getTaskDownloadGrant(task.id)).toMatchObject({ source: "single_photo", scope: "result", creditsDebited: 0 });
  expect(JSON.parse(redis.getString("stripe:checkout:receipt:cs_single")!)).toMatchObject({ creditsAdded: 0, fulfillmentKind: "task_unlock", unlockedTaskId: task.id, assetScope: "result" });
  expect(redis.getString("download:pending:task-1")).toBeUndefined();
  expect(redis.sortedMembers("user:buyer:tasks")).toEqual([task.id]);
  expect(redis.getHash(`conversion:${new Date().toISOString().slice(0,10)}`)).toEqual({ purchases: 1, single_photo_purchases: 1, revenue_minor_usd: 199 });
});
it("replays exact persisted Stripe params after losing the first response", async () => {
  const order = await reserve();
  if (order.outcome === "rejected") throw Error(order.code);
  mockCreate.mockRejectedValueOnce(new Error("network timeout"));
  await expect(recoverTaskDownloadCheckoutSession(order.pending)).rejects.toThrow("timeout");
  mockCreate.mockResolvedValueOnce({ id: "cs_recovered", status: "open", url: "https://checkout.stripe.com/test" });
  await recoverTaskDownloadCheckoutSession(order.pending);
  expect(mockCreate.mock.calls[0]).toEqual(mockCreate.mock.calls[1]);
  expect(mockCreate.mock.calls[1][1]).toEqual({ idempotencyKey: `single-result:${order.pending.orderId}` });
});
it("records an explicit refund requirement for paid sessions whose result disappeared", async () => {
  const order = await reserve();
  if (order.outcome === "rejected") throw Error(order.code);
  await redis.eval("return redis.call('DEL', KEYS[1])", ["task:task-1"], []);
  const session = { id: "cs_missing", payment_status: "paid", amount_total: 199, currency: "usd", metadata: order.pending.params.metadata } as unknown as Stripe.Checkout.Session;
  expect(await fulfillPaidCheckout(session)).toBe(false);
  expect(JSON.parse(redis.getString("stripe:checkout:refund_required:cs_missing")!).reason).toBe("TASK_NOT_FOUND");
  expect(redis.getString("stripe:checkout:receipt:cs_missing")).toBeUndefined();
  expect(quota().credits).toBe(1);
  await fulfillPaidCheckout(session);
  expect(redis.getHash(`conversion:${new Date().toISOString().slice(0,10)}`)).toEqual({ fulfillment_issues: 1 });
});
it("counts malformed paid orders once as fulfillment issues without claiming delivered revenue", async () => {
  const session = { id: "cs_wrong_amount", payment_status: "paid", amount_total: 1, currency: "usd", metadata: { userId: "buyer", product: "oldphotoliveai", plan: "single_photo", scope: "result", taskId: task.id, orderId: "bad-order" } } as unknown as Stripe.Checkout.Session;
  expect(await fulfillPaidCheckout(session)).toBe(false);
  expect(await fulfillPaidCheckout(session)).toBe(false);
  expect(redis.getHash(`conversion:${new Date().toISOString().slice(0,10)}`)).toEqual({ fulfillment_issues: 1 });
  expect(await getTaskDownloadGrant(task.id)).toBeNull();
});

it("retains deletion protection through partial cleanup, supports retries and clears expired checkout only with Stripe proof", async () => {
  expect(await beginTaskDownloadDeletion(task.id)).toBe(true);
  expect(await beginTaskDownloadDeletion(task.id)).toBe(true);
  expect(await reserve()).toMatchObject({ outcome: "rejected", code: "TASK_DELETING" });
  await releaseTaskDownloadDeletion(task.id);
  const order = await reserve();
  if (order.outcome === "rejected") throw Error(order.code);
  await saveTaskDownloadCheckoutSession(order.pending, "cs_expired");
  mockRetrieve.mockResolvedValue({ id: "cs_expired", status: "expired", payment_status: "unpaid" });
  expect(await beginTaskDownloadDeletion(task.id)).toBe(true);
  expect(redis.getString("download:pending:task-1")).toBeUndefined();
});
it("requires all master objects to exist before offering the result", async () => {
  await assertTaskDownloadMastersAvailable(task);
  expect(mockHead).toHaveBeenCalledTimes(3);
  mockHead.mockResolvedValue({ ContentLength: 0 });
  await expect(assertTaskDownloadMastersAvailable(task)).rejects.toThrow("RESULT_UNAVAILABLE");
});
it("rejects a partial full-workflow master set before reserving or charging", async () => {
  redis.setString("task:task-1", JSON.stringify({ ...task, masterAssets: { restored: "master.jpg" } }));
  expect(await reserve()).toMatchObject({ outcome: "rejected", code: "RESULT_UNAVAILABLE" });
  expect(await unlockTaskDownload(input)).toMatchObject({ outcome: "REJECTED", code: "RESULT_UNAVAILABLE" });
  expect(quota().credits).toBe(1);
});
