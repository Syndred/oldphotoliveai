import { NextRequest } from "next/server";
const mockAccess = jest.fn();
const mockTask = jest.fn();
const mockReconcile = jest.fn();
const callbacks: Array<() => Promise<void>> = [];
jest.mock("next/server", () => ({ ...jest.requireActual("next/server"), after: (cb: () => Promise<void>) => callbacks.push(cb) }));
jest.mock("@/lib/task-access", () => ({ getAccessibleTask: (...args: unknown[]) => mockAccess(...args) }));
jest.mock("@/lib/redis", () => ({ getTask: (...args: unknown[]) => mockTask(...args) }));
jest.mock("@/lib/photo-order-refund", () => ({ reconcileTaskPhotoOrderRefund: (...args: unknown[]) => mockReconcile(...args) }));
import { POST } from "@/app/api/tasks/[taskId]/refund/route";
const task = { id: "t1", userId: "u1", purchaseOrderId: "o1", status: "failed", attemptCount: 2 };
const req = () => POST(new NextRequest("https://example.com/api/tasks/t1/refund", { method: "POST" }), { params: Promise.resolve({ taskId: "t1" }) });
beforeEach(() => {
  jest.resetAllMocks(); callbacks.length = 0;
  mockAccess.mockResolvedValue({ task, mode: "authenticated" });
  mockTask.mockResolvedValue({ ...task, refundStatus: "pending" });
  mockReconcile.mockResolvedValue(undefined);
});
it.each([null, { task, mode: "anonymous" }, { task: { ...task, purchaseOrderId: undefined }, mode: "authenticated" }])("rejects unavailable, anonymous, and legacy tasks", async access => {
  mockAccess.mockResolvedValue(access);
  expect((await req()).status).toBe(404);
  expect(mockReconcile).not.toHaveBeenCalled();
});
it("returns pending only after durable reservation, leaving Stripe recovery after the response", async () => {
  const response = await req();
  expect(response.status).toBe(202);
  expect(await response.json()).toEqual({ taskId: "t1", refundStatus: "pending" });
  expect(mockReconcile).toHaveBeenCalledWith("t1", { process: false });
  expect(mockReconcile).toHaveBeenCalledTimes(1);
  await callbacks[0]();
  expect(mockReconcile).toHaveBeenLastCalledWith("t1");
});
it("does not claim success on a reservation/network uncertainty", async () => {
  mockReconcile.mockRejectedValue(new Error("Redis uncertain"));
  const response = await req();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ code: "REFUND_UNCONFIRMED" });
});
it("does not promise a refund when the first failure still has its retry", async () => {
  mockTask.mockResolvedValue({ ...task, attemptCount: 1 });
  const response = await req();
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "RETRY_AVAILABLE" });
  expect(callbacks).toHaveLength(0);
});
it("preserves the content-violation terms", async () => {
  mockAccess.mockResolvedValue({ task: { ...task, violation: true }, mode: "authenticated" });
  expect((await req()).status).toBe(409);
  expect(mockReconcile).not.toHaveBeenCalled();
});
it("replays successful refunds without scheduling another Stripe call", async () => {
  mockTask.mockResolvedValue({ ...task, refundStatus: "succeeded" });
  const response = await req();
  expect(await response.json()).toEqual({ taskId: "t1", refundStatus: "succeeded" });
  expect(callbacks).toHaveLength(0);
});
