/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { mockRouterPush, __resetI18nNavigationMocks, __setMockPathname } from "../helpers/i18n-navigation";
import { readPendingUpload, savePendingUpload } from "@/lib/pending-upload";
const mockFetch = jest.fn();
const mockSession = jest.fn();
const imageKey = "tasks/upload-1/original.jpg";
jest.mock("next-auth/react", () => ({ useSession: () => mockSession(), signIn: jest.fn() }));
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }));
jest.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock("@/components/UploadZone", () => ({ onUpload, disabled }: { onUpload: (key: string) => void; disabled: boolean }) => <button disabled={disabled} onClick={() => onUpload("tasks/upload-1/original.jpg")}>Upload a photo</button>);
import { signIn } from "next-auth/react";
import UploadSection from "@/app/sections/UploadSection";
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); __resetI18nNavigationMocks(); __setMockPathname("/photo-restoration");
  mockSession.mockReturnValue({ status: "authenticated", data: { user: { id: "user-1", tier: "pay_as_you_go" } } });
  global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => url === "/api/quota" ? Promise.resolve({ ok: true, json: async () => ({ tier: mockSession().data?.user?.tier ?? "free" }) } as Response) : mockFetch(url, init)); window.history.replaceState(null, "", "/photo-restoration");
});
it.each(["DAILY_QUOTA_EXHAUSTED", "NO_CREDITS"])("retains the uploaded source and return page on %s", async (code) => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ code, allowanceConsumed: false, error: "Allowance exhausted" }) });
  render(<UploadSection workflow="restore" />);
  fireEvent.click(screen.getByRole("button", { name: "Upload a photo" }));
  expect(await screen.findByRole("link", { name: "Buy credits — from $4.99" })).toHaveAttribute("href", "/pricing?plan=starter_pack&returnTo=%2Fphoto-restoration");
  expect(readPendingUpload("user-1", "/photo-restoration", "restore")).toMatchObject({ imageKey, workflow: "restore" });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
it("restores the previous upload without automatically consuming a credit", async () => {
  savePendingUpload({ userId: "user-1", pathname: "/photo-restoration", workflow: "restore", imageKey });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ taskId: "paid-task", allowanceConsumed: true }) });
  render(<UploadSection workflow="restore" />);
  const button = await screen.findByRole("button", { name: "Continue with this photo" });
  expect(mockFetch).not.toHaveBeenCalled();
  fireEvent.click(button);
  await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/result/paid-task"));
  expect(mockFetch).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({ body: JSON.stringify({ imageKey, workflow: "restore" }) }));
  expect(readPendingUpload("user-1", "/photo-restoration", "restore")).toBeNull();
});
it("can dismiss a retained upload without spending allowance", async () => {
  savePendingUpload({ userId: "user-1", pathname: "/photo-restoration", workflow: "restore", imageKey });
  render(<UploadSection workflow="restore" />);
  fireEvent.click(await screen.findByRole("button", { name: "Choose another photo" }));
  expect(screen.queryByRole("button", { name: "Continue with this photo" })).not.toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
  expect(readPendingUpload("user-1", "/photo-restoration", "restore")).toBeNull();
});
it("never restores another user's retained upload", () => {
  savePendingUpload({ userId: "other-user", pathname: "/photo-restoration", workflow: "restore", imageKey });
  render(<UploadSection workflow="restore" />);
  expect(screen.queryByRole("button", { name: "Continue with this photo" })).not.toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("requires payment before creating a free-account generation", async () => {
  mockSession.mockReturnValue({ status: "authenticated", data: { user: { id: "user-1", tier: "free" } } });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ orderId: "order-1", taskId: "reserved", status: "unpaid" }) });
  render(<UploadSection workflow="animate" />);
  expect(screen.getByText(/then pay \$1.99/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Upload a photo" }));
  await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/pricing?orderId=order-1&plan=single_run"));
  expect(mockFetch).toHaveBeenCalledWith("/api/photo-orders", expect.objectContaining({ body: JSON.stringify({ imageKey, workflow: "animate", locale: "en" }) }));
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
it("keeps the existing credit generation promise explicit", () => {
  render(<UploadSection workflow="animate" />);
  expect(screen.getByText(/Use your existing credits/)).toBeInTheDocument();
});
it("retains guest upload across sign-in and creates the order once on return", async () => {
  mockSession.mockReturnValue({ status: "unauthenticated", data: null });
  const view = render(<UploadSection workflow="animate" />);
  fireEvent.click(screen.getByRole("button", { name: "Upload a photo" }));
  await waitFor(() => expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/photo-restoration?resumeUpload=1#upload-section" }));
  expect(mockFetch).not.toHaveBeenCalled();
  view.unmount();
  window.history.replaceState(null, "", "/photo-restoration?resumeUpload=1");
  mockSession.mockReturnValue({ status: "authenticated", data: { user: { id: "user-1", tier: "free" } } });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ orderId: "order-1", status: "unpaid" }) });
  render(<UploadSection workflow="animate" />);
  await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/pricing?orderId=order-1&plan=single_run"));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(window.location.search).not.toContain("resumeUpload");
});

it("uses freshly purchased credits even when the login session still says free", async () => {
  mockSession.mockReturnValue({ status: "authenticated", data: { user: { id: "user-1", tier: "free" } } });
  global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => url === "/api/quota" ? Promise.resolve({ ok: true, json: async () => ({ tier: "pay_as_you_go", credits: 10 }) } as Response) : mockFetch(url, init));
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ taskId: "paid-task" }) });
  render(<UploadSection workflow="animate" />);
  fireEvent.click(screen.getByRole("button", { name: "Upload a photo" }));
  await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/result/paid-task"));
  expect(mockFetch).toHaveBeenCalledWith("/api/tasks", expect.any(Object));
  expect(mockFetch.mock.calls.some(([url]) => url === "/api/photo-orders")).toBe(false);
});
