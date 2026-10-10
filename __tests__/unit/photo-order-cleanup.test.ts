const mockScan = jest.fn();
const mockGet = jest.fn();
const mockGetTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockDeleteFiles = jest.fn();
const mockDeletePrivate = jest.fn();
const mockRemoveQueue = jest.fn();
const mockRefunds = jest.fn();
const mockReconcile = jest.fn();
const mockDrafts = jest.fn();
const mockUploads = jest.fn();
jest.mock("@/lib/upload-cleanup", () => ({ cleanupUploadedPhotos: (...a: unknown[]) => mockUploads(...a) }));
jest.mock("@/lib/config", () => ({ config: { worker: { secret: "secret" } } }));
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ scan: mockScan, get: mockGet }), getTask: (...a: unknown[]) => mockGetTask(...a), hardDeleteTask: (...a: unknown[]) => mockDeleteTask(...a) }));
jest.mock("@/lib/r2", () => ({ deleteTaskFiles: (...a: unknown[]) => mockDeleteFiles(...a), deletePrivateTaskFiles: (...a: unknown[]) => mockDeletePrivate(...a) }));
jest.mock("@/lib/queue", () => ({ removeFromQueue: (...a: unknown[]) => mockRemoveQueue(...a) }));
jest.mock("@/lib/photo-order-refund", () => ({ processPendingPhotoOrderRefunds: (...a: unknown[]) => mockRefunds(...a), reconcileTaskPhotoOrderRefund: (...a: unknown[]) => mockReconcile(...a) }));
jest.mock("@/lib/photo-order", () => ({ cleanupUnpaidPhotoOrders: (...a: unknown[]) => mockDrafts(...a) }));
import { POST } from "@/app/api/worker/cleanup/route";
const oldTask = { id: "t1", userId: "u1", purchaseOrderId: "o1", status: "failed", createdAt: "2025-01-01T00:00:00.000Z", originalImageKey: "orders/o1/original.jpg" };
const run = () => POST(new Request("https://example.com/api/worker/cleanup", { method: "POST", headers: { Authorization: "Bearer secret" } }));
beforeEach(() => {
  jest.resetAllMocks();
  mockScan.mockResolvedValue(["0", ["task:t1"]]);
  mockGet.mockResolvedValue(oldTask);
  mockGetTask.mockResolvedValue({ ...oldTask, refundStatus: "pending" });
  mockRefunds.mockResolvedValue(undefined);
  mockDrafts.mockResolvedValue({ checked: 0, deleted: 0, deferred: 0 });
});
it.each([undefined, "pending", "review_required"])("retains failed paid task evidence while refund is %s", async refundStatus => {
  mockGetTask.mockResolvedValue({ ...oldTask, refundStatus });
  expect((await run()).status).toBe(200);
  expect(mockReconcile).toHaveBeenCalledWith("t1", { retentionExpired: true, process: false });
  expect(mockDeleteTask).not.toHaveBeenCalled();
  expect(mockDeleteFiles).not.toHaveBeenCalled();
});
it("cleans a refunded failed task only after refund recovery, and leaves durable order storage intact", async () => {
  mockGetTask.mockResolvedValue({ ...oldTask, refundStatus: "succeeded" });
  expect((await run()).status).toBe(200);
  expect(mockRefunds.mock.invocationCallOrder[0]).toBeLessThan(mockDeleteFiles.mock.invocationCallOrder[0]);
  expect(mockDeleteTask).toHaveBeenCalledWith("t1");
  expect(mockRemoveQueue).toHaveBeenCalledWith("t1");
  expect(mockDrafts).toHaveBeenCalledWith(3);
  expect(mockUploads).toHaveBeenCalledWith(3);
});
it("keeps old legacy cleanup and moderation retention behavior", async () => {
  mockGet.mockResolvedValue({ ...oldTask, violation: true });
  expect((await run()).status).toBe(200);
  expect(mockReconcile).not.toHaveBeenCalled();
  expect(mockDeleteFiles).toHaveBeenCalledTimes(1);
});
it("does not let draft cleanup errors discard payment evidence", async () => {
  mockDrafts.mockRejectedValue(new Error("Stripe unavailable"));
  expect((await run()).status).toBe(200);
  expect(mockDeleteTask).not.toHaveBeenCalled();
});
