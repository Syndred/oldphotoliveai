import { NextRequest } from "next/server";
const mockToken = jest.fn();
const mockAccess = jest.fn();
const mockUser = jest.fn();
const mockUpgrade = jest.fn();
const mockExisting = jest.fn();
const mockWakeup = jest.fn();
jest.mock("@/lib/worker-wakeup", () => ({ schedulePipelineWakeupForStatus: (...args: unknown[]) => mockWakeup(...args) }));
jest.mock("@/lib/task-creation", () => ({ getExistingTaskUpgrade: (...args: unknown[]) => mockExisting(...args) }));
jest.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => mockToken(...args) }));
jest.mock("@/lib/task-access", () => ({ getAccessibleTask: (...args: unknown[]) => mockAccess(...args) }));
jest.mock("@/lib/redis", () => ({ getUser: (...args: unknown[]) => mockUser(...args) }));
jest.mock("@/lib/task-upgrade", () => ({ createTaskUpgrade: (...args: unknown[]) => mockUpgrade(...args) }));
import { POST } from "@/app/api/tasks/[taskId]/upgrade/route";
const request = () => new NextRequest("http://localhost/api/tasks/source/upgrade", { method: "POST" });
const props = { params: Promise.resolve({ taskId: "source" }) };
beforeEach(() => {
  jest.clearAllMocks();
  mockExisting.mockResolvedValue(undefined);
  mockToken.mockResolvedValue({ userId: "signed-in-user" });
  mockAccess.mockResolvedValue({ mode: "anonymous", task: { id: "source", status: "completed", priority: "normal", generationTier: "free" } });
  mockUser.mockResolvedValue({ id: "signed-in-user", tier: "pay_as_you_go" });
  mockUpgrade.mockResolvedValue({ outcome: "created", task: { id: "hd-result" } });
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
});

it("requires sign-in before accepting an upgrade", async () => {
  mockToken.mockResolvedValue(null);
  expect((await POST(request(), props)).status).toBe(401);
  expect(mockUpgrade).not.toHaveBeenCalled();
});
it("rejects a source task inaccessible to the current user and browser", async () => {
  mockAccess.mockResolvedValue(null);
  expect((await POST(request(), props)).status).toBe(404);
  expect(mockUpgrade).not.toHaveBeenCalled();
});
it.each([
  { status: "restoring", priority: "normal" },
  { status: "completed", priority: "normal", violation: true },
  { status: "completed", priority: "high" },
])("rejects an ineligible source %j", async (task) => {
  mockAccess.mockResolvedValue({ task, mode: "authenticated" });
  expect((await POST(request(), props)).status).toBe(400);
  expect(mockUpgrade).not.toHaveBeenCalled();
});
it("requires a paid account without consuming the free allowance", async () => {
  mockUser.mockResolvedValue({ id: "signed-in-user", tier: "free" });
  const response = await POST(request(), props);
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "PAYMENT_REQUIRED", allowanceConsumed: false });
  expect(mockUpgrade).not.toHaveBeenCalled();
});
it("can upgrade an anonymous result owned by the signed-in user's browser", async () => {
  const response = await POST(request(), props);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ taskId: "hd-result", replayed: false, allowanceConsumed: true });
  expect(mockUpgrade).toHaveBeenCalledWith(expect.objectContaining({ id: "signed-in-user" }), expect.objectContaining({ id: "source" }));
  expect(mockWakeup).toHaveBeenCalledWith("pending");
});
it("reports a replay as no new credit charge", async () => {
  mockUpgrade.mockResolvedValue({ outcome: "existing", taskId: "hd-result" });
  const response = await POST(request(), props);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ taskId: "hd-result", replayed: true, allowanceConsumed: false });
});
it("surfaces an exhausted paid balance distinctly", async () => {
  mockUpgrade.mockResolvedValue({ outcome: "rejected", code: "NO_CREDITS" });
  const response = await POST(request(), props);
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "NO_CREDITS", allowanceConsumed: false });
});

it("recovers a committed remake before checking balance or copying the source again", async () => {
  mockExisting.mockResolvedValue("already-paid-task");
  mockUser.mockResolvedValue({ id: "signed-in-user", tier: "free" });
  const response = await POST(request(), props);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ taskId: "already-paid-task", replayed: true, allowanceConsumed: false });
  expect(mockExisting).toHaveBeenCalledWith("signed-in-user", expect.objectContaining({ id: "source" }));
  expect(mockUser).not.toHaveBeenCalled();
  expect(mockUpgrade).not.toHaveBeenCalled();
});
it("never looks up a paid remake before validating source access", async () => {
  mockAccess.mockResolvedValue(null);
  mockExisting.mockResolvedValue("private-task");
  expect((await POST(request(), props)).status).toBe(404);
  expect(mockExisting).not.toHaveBeenCalled();
});
