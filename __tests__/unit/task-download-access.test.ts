import { NextRequest } from "next/server";
const mockToken = jest.fn();
const mockOwned = jest.fn();
const mockAnonymous = jest.fn();
const mockGrantAccess = jest.fn();
jest.mock("next-auth/jwt", () => ({ getToken: () => mockToken() }));
jest.mock("@/lib/redis", () => ({ getTaskOwnedByUser: (...a: unknown[]) => mockOwned(...a), getAnonymousTaskOwnedByVisitor: (...a: unknown[]) => mockAnonymous(...a) }));
jest.mock("@/lib/task-download", () => ({ hasTaskDownloadAccess: (...a: unknown[]) => mockGrantAccess(...a) }));
import { getAccessibleTask } from "@/lib/task-access";
const task = { id: "t", userId: "anonymous:v", downloadPolicy: "preview_v1" };
const req = () => new NextRequest("https://example.com/api/tasks/t/status", { headers: { Cookie: "opla_anon_visitor=v" } });
beforeEach(() => { jest.clearAllMocks(); mockToken.mockResolvedValue(null); mockOwned.mockResolvedValue(null); mockAnonymous.mockResolvedValue(task); mockGrantAccess.mockResolvedValue(false); });
it("the original anonymous cookie never unlocks the private result", async () => {
  expect(await getAccessibleTask(req(), "t")).toEqual({ task, mode: "anonymous", downloadUnlocked: false });
  expect(mockGrantAccess).not.toHaveBeenCalled();
});
it("another account in the same browser only sees the preview", async () => {
  mockToken.mockResolvedValue({ userId: "other" });
  expect((await getAccessibleTask(req(), "t"))?.downloadUnlocked).toBe(false);
  expect(mockGrantAccess).toHaveBeenCalledWith("t", "other");
});
it("a buyer's account can open its result without the anonymous cookie", async () => {
  mockToken.mockResolvedValue({ userId: "buyer" }); mockOwned.mockResolvedValue(task); mockGrantAccess.mockResolvedValue(true);
  expect(await getAccessibleTask(new NextRequest("https://example.com/api/tasks/t/status"), "t")).toEqual({ task, mode: "authenticated", downloadUnlocked: true });
});
