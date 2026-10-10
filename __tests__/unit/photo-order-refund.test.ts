import type { Task } from "@/types";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockEval = jest.fn();
const mockGetTask = jest.fn();
const mockCreate = jest.fn();
const mockRetrieve = jest.fn();
const mockList = jest.fn();
const mockZrange = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval, zrange: mockZrange }), getTask: (...args: unknown[]) => mockGetTask(...args) }));
jest.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ refunds: { create: mockCreate, retrieve: mockRetrieve, list: mockList } }) }));
import { PHOTO_REFUND_QUEUE, reconcileTaskPhotoOrderRefund, recoverPhotoOrderRefund, processPendingPhotoOrderRefunds } from "@/lib/photo-order-refund";
import { retryTaskAtomic } from "@/lib/task-retry";
import { TASK_EXECUTION_REPLACE_SCRIPT, TASK_EXECUTION_BEGIN_SCRIPT } from "@/lib/task-execution";
import { toPublicTaskStatus } from "@/lib/task-status";

let redis: RedisLuaFixture;
const initialTask = {
  id: "t1", userId: "u1", purchaseOrderId: "o1", status: "failed", priority: "high", generationTier: "pay_as_you_go",
  workflow: "restore", attemptCount: 2, originalImageKey: "original.jpg", restoredImageKey: null,
  colorizedImageKey: null, animationVideoKey: null, errorMessage: "Failed", internalErrorMessage: "private",
  failureStage: "restoring", failureCode: "processing_failed", progress: 25,
  createdAt: new Date().toISOString(), completedAt: null, executionToken: "worker-token",
} satisfies Task;
const initialOrder = { id: "o1", userId: "u1", taskId: "t1", status: "paid", amountTotal: 199, currency: "usd", paidSessionId: "cs_paid", paymentIntentId: "pi_paid" };
const refund = (status = "succeeded") => ({ id: "re_once", status, amount: 199, currency: "usd", payment_intent: "pi_paid", metadata: { photoOrderId: "o1" } });
const task = () => JSON.parse(redis.getString("task:t1")!);
const order = () => JSON.parse(redis.getString("photo:order:o1")!);
function setTask(changes: Partial<Task>) { redis.setString("task:t1", JSON.stringify({ ...task(), ...changes })); }
function setOrder(changes: Record<string, unknown>) { redis.setString("photo:order:o1", JSON.stringify({ ...order(), ...changes })); }
const later = (ms = 61000) => new Date(Date.now() + ms);
beforeEach(() => {
  jest.resetAllMocks();
  redis = new RedisLuaFixture();
  redis.setString("task:t1", JSON.stringify(initialTask));
  redis.setString("photo:order:o1", JSON.stringify(initialOrder));
  mockGetTask.mockImplementation(async () => task());
  mockEval.mockImplementation((script, keys, args) => redis.eval(script, keys, args));
  mockZrange.mockImplementation(async () => redis.sortedMembers(PHOTO_REFUND_QUEUE));
  mockCreate.mockResolvedValue(refund());
  mockRetrieve.mockResolvedValue(refund());
  mockList.mockResolvedValue({ data: [] });
});

it("reserves once across concurrent final failures, refunds once, and never changes tier/credits", async () => {
  redis.setString("user:u1", JSON.stringify({ tier: "free" }));
  redis.setString("quota:u1", JSON.stringify({ credits: 8 }));
  await Promise.all([reconcileTaskPhotoOrderRefund("t1"), reconcileTaskPhotoOrderRefund("t1"), reconcileTaskPhotoOrderRefund("t1")]);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledWith({ payment_intent: "pi_paid", amount: 199, metadata: { product: "oldphotoliveai", photoOrderId: "o1", taskId: "t1" } }, { idempotencyKey: "photo-order-refund:o1:v1", timeout: 6000, maxNetworkRetries: 0 });
  expect(order()).toMatchObject({ status: "refunded", refund: { status: "succeeded", refundId: "re_once" } });
  expect(task()).toMatchObject({ status: "failed", refundStatus: "succeeded", executionToken: null });
  expect(redis.sortedMembers(PHOTO_REFUND_QUEUE)).toEqual([]);
  expect(JSON.parse(redis.getString("quota:u1")!).credits).toBe(8);
  expect(JSON.parse(redis.getString("user:u1")!).tier).toBe("free");
});

it("gives exactly one free same-task retry and does not refund the first recoverable failure", async () => {
  setTask({ attemptCount: 1 });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(order().refund).toBeUndefined();
  expect(mockCreate).not.toHaveBeenCalled();
  const results = await Promise.all([retryTaskAtomic(task()), retryTaskAtomic(task())]);
  expect(results.map(item => item.outcome).sort()).toEqual(["already_queued", "retried"]);
  expect(task().attemptCount).toBe(2);
  setTask({ status: "failed" });
  expect(await retryTaskAtomic(task())).toEqual({ outcome: "rejected", code: "RETRY_LIMIT_REACHED" });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(mockCreate).toHaveBeenCalledTimes(1);
});

it("locks retry and both worker fences before issuing any refund request", async () => {
  await reconcileTaskPhotoOrderRefund("t1", { process: false });
  expect(task().refundStatus).toBe("pending");
  expect(mockCreate).not.toHaveBeenCalled();
  expect(await retryTaskAtomic(task())).toMatchObject({ outcome: "rejected", code: "REFUND_IN_PROGRESS" });
  expect(await redis.eval(TASK_EXECUTION_REPLACE_SCRIPT, ["task:t1"], ["worker-token", JSON.stringify({ ...task(), status: "completed" })])).toBe("STALE");
  setTask({ status: "queued", executionToken: "worker-token" });
  redis.setString("lock:t1", "lock-token");
  redis.addSorted("queue:processing", Date.now() + 10000, "worker-token");
  expect(await redis.eval(TASK_EXECUTION_BEGIN_SCRIPT, ["task:t1", "queue:processing", "lock:t1"], ["worker-token", "lock-token", String(Date.now()), new Date().toISOString()])).toBe("TERMINAL");
  expect(await redis.eval(TASK_EXECUTION_REPLACE_SCRIPT, ["task:t1"], ["worker-token", JSON.stringify(task())])).toBe("TERMINAL");
});

it("keeps an unknown Stripe result pending and recovers the same idempotent refund", async () => {
  mockCreate.mockRejectedValueOnce(new Error("network response lost"));
  await reconcileTaskPhotoOrderRefund("t1");
  expect(task().refundStatus).toBe("pending");
  expect(order().refund.errorCode).toBe("REFUND_UNCONFIRMED");
  await recoverPhotoOrderRefund("o1", later());
  expect(mockCreate).toHaveBeenCalledTimes(2);
  expect(mockCreate.mock.calls[0]).toEqual(mockCreate.mock.calls[1]);
  expect(task().refundStatus).toBe("succeeded");
});

it("persists a pending refund ID, polls it instead of creating again, and distinguishes bank success", async () => {
  mockCreate.mockResolvedValueOnce(refund("pending"));
  await reconcileTaskPhotoOrderRefund("t1");
  expect(task().refundStatus).toBe("pending");
  expect(order().refund.refundId).toBe("re_once");
  await recoverPhotoOrderRefund("o1", later());
  expect(mockRetrieve).toHaveBeenCalledWith("re_once", { timeout: 6000, maxNetworkRetries: 0 });
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(task().refundStatus).toBe("succeeded");
});

it.each(["failed", "canceled", "requires_action"])("a Stripe %s refund becomes support review without another create", async status => {
  mockCreate.mockResolvedValueOnce(refund(status));
  await reconcileTaskPhotoOrderRefund("t1");
  await recoverPhotoOrderRefund("o1", later());
  expect(task().refundStatus).toBe("review_required");
  expect(mockCreate).toHaveBeenCalledTimes(1);
});

it("never recreates an unknown refund after the idempotency window; reconciles read-only", async () => {
  await reconcileTaskPhotoOrderRefund("t1", { process: false });
  setOrder({ refund: { ...order().refund, requestedAt: new Date(Date.now() - 24 * 3600000).toISOString() } });
  await recoverPhotoOrderRefund("o1");
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockList).toHaveBeenCalledTimes(1);
  expect(task().refundStatus).toBe("review_required");
});

it("reconciles a previously completed refund by order metadata after the replay window", async () => {
  await reconcileTaskPhotoOrderRefund("t1", { process: false });
  setOrder({ refund: { ...order().refund, requestedAt: new Date(Date.now() - 24 * 3600000).toISOString() } });
  mockList.mockResolvedValue({ data: [refund()] });
  await recoverPhotoOrderRefund("o1");
  expect(task().refundStatus).toBe("succeeded");
  expect(mockCreate).not.toHaveBeenCalled();
});

it.each([{ status: "unpaid" }, { amountTotal: 1 }, { currency: "eur" }, { userId: "other" }, { taskId: "other" }, { paidSessionId: undefined }])("does not refund an unpaid/mismatched order: %j", async mismatch => {
  setOrder(mismatch);
  await reconcileTaskPhotoOrderRefund("t1");
  expect(order().refund).toBeUndefined();
  expect(mockCreate).not.toHaveBeenCalled();
});

it.each(["completed", "queued", "restoring"] as const)("does not refund a %s task even after two attempts", async status => {
  setTask({ status });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(mockCreate).not.toHaveBeenCalled();
  expect(order().refund).toBeUndefined();
});

it("does not promise refunds for content policy rejection", async () => {
  setTask({ violation: true });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(mockCreate).not.toHaveBeenCalled();
  expect(order().refund).toBeUndefined();
});

it("puts unknown provider creation under support review without retrying or refunding", async () => {
  setTask({ attemptCount: 1, failureCode: "provider_creation_unknown", providerInvocations: { restoring: { status: "creation_unknown", modelKey: "restoration", updatedAt: new Date().toISOString() } } });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(task().refundStatus).toBe("review_required");
  expect(mockCreate).not.toHaveBeenCalled();
  expect((await retryTaskAtomic(task())).outcome).toBe("rejected");
});

it("allows a first known provider prediction to resume, but does not pretend its second timeout is definitive", async () => {
  setTask({ attemptCount: 1, providerInvocations: { restoring: { status: "active", predictionId: "known", modelKey: "restoration", updatedAt: new Date().toISOString() } } });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(order().refund).toBeUndefined();
  expect((await retryTaskAtomic(task())).outcome).toBe("retried");
  expect(task().providerInvocations.restoring.predictionId).toBe("known");
  setTask({ status: "failed" });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(task().refundStatus).toBe("review_required");
  expect(mockCreate).not.toHaveBeenCalled();
});

it("resumes durable pending work after a worker stopped before Stripe", async () => {
  await reconcileTaskPhotoOrderRefund("t1", { process: false });
  expect(redis.sortedMembers(PHOTO_REFUND_QUEUE)).toEqual(["o1"]);
  await processPendingPhotoOrderRefunds();
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(task().refundStatus).toBe("succeeded");
});

it("refunds a failed abandoned task before retention cleanup can discard its source", async () => {
  setTask({ attemptCount: 1, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() });
  await reconcileTaskPhotoOrderRefund("t1", { retentionExpired: true });
  expect(task().refundStatus).toBe("succeeded");
});

it("exposes only safe refund state and exactly one retry in public status", () => {
  const first = toPublicTaskStatus({ ...initialTask, attemptCount: 1 }, "authenticated");
  expect(first).toMatchObject({ paidSingleRun: true, retryAllowed: true });
  const last = toPublicTaskStatus({ ...initialTask, refundStatus: "pending" }, "authenticated");
  expect(last).toMatchObject({ retryAllowed: false, refundStatus: "pending" });
  expect(last.purchaseOrderId).toBeUndefined();
  expect(last.internalErrorMessage).toBeUndefined();
  expect(JSON.stringify(last)).not.toContain("pi_paid");
});

it("a concurrent retry cannot outrun a final-failure refund reservation", async () => {
  const [retried] = await Promise.all([retryTaskAtomic(task()), reconcileTaskPhotoOrderRefund("t1", { process: false })]);
  expect(retried.outcome).toBe("rejected");
  expect(task().refundStatus).toBe("pending");
  expect(redis.sortedMembers("queue:tasks")).toEqual([]);
});

it("does not falsely report success if Stripe succeeded but persisting its response failed", async () => {
  let lost = false;
  mockEval.mockImplementation((script, keys, args) => {
    if (!lost && script.includes("A later response") && args[1] === "succeeded") {
      lost = true;
      throw new Error("redis response unavailable");
    }
    return redis.eval(script, keys, args);
  });
  await reconcileTaskPhotoOrderRefund("t1");
  expect(task().refundStatus).toBe("pending");
  await recoverPhotoOrderRefund("o1", later());
  expect(mockCreate.mock.calls[1]).toEqual(mockCreate.mock.calls[0]);
  expect(task().refundStatus).toBe("succeeded");
});
