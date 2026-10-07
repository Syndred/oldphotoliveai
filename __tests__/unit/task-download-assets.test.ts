import { NextRequest } from "next/server";
import type { Task } from "@/types";
jest.mock("@/lib/conversion-metrics", () => ({ recordResultDownloadRequest: jest.fn().mockResolvedValue(undefined) }));
const mockAccessible = jest.fn();
const mockPublicObject = jest.fn();
const mockPrivateObject = jest.fn();
jest.mock("@/lib/task-access", () => ({ getAccessibleTask: (...args: unknown[]) => mockAccessible(...args) }));
jest.mock("@/lib/r2", () => ({
  getObjectFromR2: (...args: unknown[]) => mockPublicObject(...args),
  getPrivateObjectFromR2: (...args: unknown[]) => mockPrivateObject(...args),
  r2BodyToWebStream: (body: Uint8Array) => new ReadableStream({ start(c) { c.enqueue(body); c.close(); } }),
}));
import { GET } from "@/app/api/tasks/[taskId]/asset/route";
import { toPublicTaskStatus } from "@/lib/task-status";
const task = {
  id: "test-task", userId: "anonymous:visitor", status: "completed", priority: "normal", workflow: "animate",
  generationTier: "free", downloadPolicy: "preview_v1", masterAssets: { restored: "private/restored.jpg", animation: "private/animation.mp4" },
  originalImageKey: "original.jpg", restoredImageKey: "preview.jpg", colorizedImageKey: null, animationVideoKey: "preview.mp4",
  progress: 100, violation: false, createdAt: "2026-10-07T00:00:00.000Z", completedAt: "2026-10-07T00:00:01.000Z",
  errorMessage: null, internalErrorMessage: null, failureStage: null,
} satisfies Task;
function request(query: string, headers?: Record<string, string>) {
  return GET(new NextRequest(`http://localhost/api/tasks/test-task/asset?${query}`, { headers }), { params: Promise.resolve({ taskId: "test-task" }) });
}
beforeEach(() => {
  jest.clearAllMocks();
  mockAccessible.mockResolvedValue({ task, mode: "anonymous", downloadUnlocked: false });
  mockPublicObject.mockResolvedValue({ Body: new Uint8Array([1, 2]), ContentType: "video/mp4", ContentLength: 2 });
  mockPrivateObject.mockResolvedValue({ Body: new Uint8Array([3, 4]), ContentType: "video/mp4", ContentLength: 2 });
});
it("serves only the watermarked video for a locked inline/range request", async () => {
  const response = await request("kind=animation&key=private/animation.mp4", { range: "bytes=0-1" });
  expect(response.status).toBe(200);
  expect(mockPublicObject).toHaveBeenCalledWith("preview.mp4", { range: "bytes=0-1" });
  expect(mockPrivateObject).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it.each(["animation", "restored"])("blocks locked %s downloads before touching either bucket", async kind => {
  const response = await request(`kind=${kind}&download=1`, { range: "bytes=0-1" });
  expect(response.status).toBe(403);
  expect(mockPublicObject).not.toHaveBeenCalled();
  expect(mockPrivateObject).not.toHaveBeenCalled();
});
it("allows retrieving the user's source without selling their own upload", async () => {
  expect((await request("kind=original&download=1")).status).toBe(200);
  expect(mockPublicObject).toHaveBeenCalledWith("original.jpg", {});
});
it("streams the same private master after account-bound unlock, including video ranges", async () => {
  mockAccessible.mockResolvedValue({ task, mode: "authenticated", downloadUnlocked: true });
  mockPrivateObject.mockResolvedValue({ Body: new Uint8Array([3, 4]), ContentType: "video/mp4", ContentRange: "bytes 0-1/10", ContentLength: 2 });
  const response = await request("kind=animation&download=1", { range: "bytes=0-1" });
  expect(response.status).toBe(206);
  expect(mockPrivateObject).toHaveBeenCalledWith("private/animation.mp4", { range: "bytes=0-1" });
  expect(mockPublicObject).not.toHaveBeenCalled();
  expect(response.headers.get("content-disposition")).toContain("attachment");
  expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([3, 4]);
});
it("never falls back to pretending a preview is the purchased master", async () => {
  mockAccessible.mockResolvedValue({ task: { ...task, masterAssets: {} }, mode: "authenticated", downloadUnlocked: true });
  expect((await request("kind=animation&download=1")).status).toBe(404);
  expect(mockPublicObject).not.toHaveBeenCalled();
});
it("preserves legacy free downloads and paid-generation downloads", async () => {
  mockAccessible.mockResolvedValue({ task: { ...task, downloadPolicy: undefined }, mode: "anonymous" });
  expect((await request("kind=animation&download=1")).status).toBe(200);
  expect(mockPublicObject).toHaveBeenCalledWith("preview.mp4", {});
});
it("rejects a requester with no task access", async () => {
  mockAccessible.mockResolvedValue(null);
  expect((await request("kind=animation&download=1")).status).toBe(404);
  expect(mockPrivateObject).not.toHaveBeenCalled();
});
it("keeps private keys/provider URLs outside both public status shapes", () => {
  for (const unlocked of [false, true]) {
    const status = toPublicTaskStatus({ ...task, providerInvocations: { animating: { status: "succeeded", modelKey: "animationFree", outputUrl: "https://provider/private.mp4", updatedAt: task.createdAt } } }, "authenticated", unlocked);
    expect(status.downloadUnlocked).toBe(unlocked);
    expect(status.downloadPolicy).toBe("preview_v1");
    expect(JSON.stringify(status)).not.toContain("private/");
    expect(JSON.stringify(status)).not.toContain("provider/");
    expect(status.masterAssets).toBeUndefined();
  }
});
