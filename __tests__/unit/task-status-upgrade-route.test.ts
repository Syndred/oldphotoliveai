import { NextRequest } from "next/server";
const mockToken = jest.fn();
const mockAccess = jest.fn();
const mockExisting = jest.fn();
jest.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => mockToken(...args) }));
jest.mock("@/lib/task-access", () => ({ getAccessibleTask: (...args: unknown[]) => mockAccess(...args) }));
jest.mock("@/lib/task-creation", () => ({ getExistingTaskUpgrade: (...args: unknown[]) => mockExisting(...args) }));
jest.mock("@/lib/worker-wakeup", () => ({ schedulePipelineWakeupForStatus: jest.fn() }));
import { GET } from "@/app/api/tasks/[taskId]/status/route";
const props = { params: Promise.resolve({ taskId: "anonymous-source" }) };
const request = () => new NextRequest("http://localhost/api/tasks/anonymous-source/status");
const source = { id: "anonymous-source", userId: "anonymous-owner", status: "completed", priority: "normal", generationTier: "free" };
beforeEach(() => {
  jest.clearAllMocks();
  mockAccess.mockResolvedValue({ task: source, mode: "anonymous" });
  mockToken.mockResolvedValue({ userId: "paid-owner" });
  mockExisting.mockResolvedValue("paid-remake");
});
it("exposes only the currently signed-in requester's remake of an anonymous source", async () => {
  const response = await GET(request(), props);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ existingUpgradeTaskId: "paid-remake" });
  expect(mockExisting).toHaveBeenCalledWith("paid-owner", source);
});
it("never exposes any paid remake to a signed-out browser holding the anonymous cookie", async () => {
  mockToken.mockResolvedValue(null);
  const response = await GET(request(), props);
  expect((await response.json()).existingUpgradeTaskId).toBeUndefined();
  expect(mockExisting).not.toHaveBeenCalled();
});
it("does not use the anonymous source owner ID to find another account's paid remake", async () => {
  mockToken.mockResolvedValue({ userId: "different-account" });
  mockExisting.mockResolvedValue(undefined);
  const response = await GET(request(), props);
  expect((await response.json()).existingUpgradeTaskId).toBeUndefined();
  expect(mockExisting).toHaveBeenCalledWith("different-account", source);
});
it("does not reveal a paid remake without source access", async () => {
  mockAccess.mockResolvedValue(null);
  expect((await GET(request(), props)).status).toBe(404);
  expect(mockExisting).not.toHaveBeenCalled();
});
