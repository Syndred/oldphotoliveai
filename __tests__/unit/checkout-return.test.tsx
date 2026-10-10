/** @jest-environment jsdom */
import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
const mockSession = jest.fn();
const mockPurchase = jest.fn();
const mockFetch = jest.fn();
jest.mock("next-auth/react", () => ({ useSession: () => mockSession(), signIn: jest.fn() }));
jest.mock("next-intl", () => ({ useLocale: () => "zh" }));
jest.mock("@/lib/analytics", () => ({ trackVerifiedPurchase: (...args: unknown[]) => mockPurchase(...args) }));
import CheckoutReturn from "@/components/CheckoutReturn";
const receipt = { status: "fulfilled", transactionId: "a".repeat(64), plan: "starter_pack", amountTotal: 499, currency: "usd", creditsAdded: 10, taskId: "photo-1" };
beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockReturnValue({ status: "authenticated" });
  global.fetch = mockFetch;
  window.history.replaceState(null, "", "/zh/pricing?session_id=cs_test_paid");
});
it("shows credited payment and returns to the same photo without starting a generation", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => receipt });
  const refresh = jest.fn();
  render(<CheckoutReturn onConfirmed={refresh} />);
  expect(await screen.findByText("付款已确认，积分已到账。")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "继续处理这张照片" })).toHaveAttribute("href", "/zh/result/photo-1?upgrade=1");
  expect(mockPurchase).toHaveBeenCalledWith(receipt);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch.mock.calls[0][0]).toBe("/api/stripe/checkout/status?session_id=cs_test_paid");
});
it("restores a pending upload through an allowlisted localized tool route", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ...receipt, taskId: undefined, returnTo: "/zh/restore-old-photos" }) });
  render(<CheckoutReturn />);
  expect(await screen.findByRole("link", { name: "继续处理已上传的照片" })).toHaveAttribute("href", "/zh/restore-old-photos?resumeUpload=1#upload-section");
});
it("does not trust success=true or fire a purchase from a URL flag", () => {
  window.history.replaceState(null, "", "/zh/pricing?success=true");
  render(<CheckoutReturn />);
  expect(screen.queryByTestId("checkout-return")).not.toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockPurchase).not.toHaveBeenCalled();
});
it("shows a verification error without claiming credits arrived", async () => {
  mockFetch.mockResolvedValue({ ok: false });
  render(<CheckoutReturn />);
  expect(await screen.findByText("暂时无法确认付款，请先重新查询，避免重复购买。")).toBeInTheDocument();
  expect(screen.queryByText("付款已确认，积分已到账。")).not.toBeInTheDocument();
  expect(mockPurchase).not.toHaveBeenCalled();
});
it("keeps paid-but-not-credited status distinct from a completed purchase", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: "processing" }) });
  const view = render(<CheckoutReturn />);
  await waitFor(() => expect(screen.getByText("已收到付款，正在开通购买权益。")).toBeInTheDocument());
  expect(mockPurchase).not.toHaveBeenCalled();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  view.unmount();
});

it("confirms a single-result unlock without claiming credits or Professional access", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ...receipt, plan: "single_photo", creditsAdded: 0, amountTotal: 199 }) });
  render(<CheckoutReturn />);
  expect(await screen.findByText("付款已确认，当前结果已解锁。")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "下载当前结果" })).toHaveAttribute("href", "/zh/result/photo-1?unlocked=1");
  expect(screen.queryByText(/专业版已开通/)).not.toBeInTheDocument();
  expect(screen.queryByText(/已到账积分/)).not.toBeInTheDocument();
});

it("stops polling a paid delivery exception, provides support, and allows a manual recheck", async () => {
  jest.useFakeTimers();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: "refund_required", taskId: "photo-1" }) });
  const refresh = jest.fn();
  const view = render(<CheckoutReturn onConfirmed={refresh} />);
  expect(await screen.findByText(/已收到付款，但当前结果交付异常/)).toHaveTextContent("尚未确认退款");
  expect(screen.getByRole("link", { name: /联系支持/ })).toHaveAttribute("href", "mailto:support@oldphotoliveai.com");
  expect(screen.queryByRole("link", { name: "下载当前结果" })).not.toBeInTheDocument();
  expect(mockPurchase).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(30_000); });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "重新查询" }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  view.unmount();
  jest.useRealTimers();
});

it("confirms single-run processing without claiming credits or completed downloads", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ...receipt, plan: "single_run", fulfillmentKind: "photo_processing", creditsAdded: 0, amountTotal: 199 }) });
  render(<CheckoutReturn />);
  expect(await screen.findByText("付款已确认，正在处理照片")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "查看照片处理状态" })).toHaveAttribute("href", "/zh/result/photo-1");
  expect(screen.queryByText(/积分已到账|当前结果已解锁|专业版已开通/)).not.toBeInTheDocument();
});
