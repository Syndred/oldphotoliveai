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
import UploadSection from "@/app/sections/UploadSection";
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); __resetI18nNavigationMocks(); __setMockPathname("/photo-restoration");
  mockSession.mockReturnValue({ status: "authenticated", data: { user: { id: "user-1" } } });
  global.fetch = mockFetch;
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

it("discloses paid downloads before a free upload", () => {
  render(<UploadSection workflow="animate" />);
  const notice = screen.getByText(/Generate a free watermarked preview first/);
  expect(notice).toHaveTextContent("$1.99");
  expect(notice).toHaveTextContent("does not increase resolution");
  expect(notice.compareDocumentPosition(screen.getByRole("button", { name: "Upload a photo" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it("keeps the old paid generation promise explicit before uploading", () => {
  mockSession.mockReturnValue({ status: "authenticated", data: { user: { id: "user-1", tier: "pay_as_you_go" } } });
  render(<UploadSection workflow="animate" />);
  expect(screen.getByText(/This generation uses 1 credit and includes downloads/)).toBeInTheDocument();
  expect(screen.queryByText(/Generate a free watermarked preview first/)).not.toBeInTheDocument();
});
