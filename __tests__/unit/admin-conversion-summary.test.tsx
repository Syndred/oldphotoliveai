/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConversionSummary from "@/components/admin/ConversionSummary";
import AdminPanel from "@/components/admin/AdminPanel";
jest.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));
const mockFetch = jest.fn();
const data = { timezone: "UTC", scope: "since_instrumentation", daily: [
  { date: "2026-10-07", purchases: 2, revenueMinorUsd: 1498, generationsCompleted: 15, paidGenerationsCompleted: 4, hdRemakesCompleted: 3, previewsCompleted: 5, singlePhotoPurchases: 1, creditUnlocks: 2, resultDownloadRequests: 3, fulfillmentIssues: 0 },
  { date: "2026-10-06", purchases: 1, revenueMinorUsd: 499, generationsCompleted: 11, paidGenerationsCompleted: 5, hdRemakesCompleted: 2, previewsCompleted: 7, singlePhotoPurchases: 0, creditUnlocks: 1, resultDownloadRequests: 0, fulfillmentIssues: 1 },
] };
beforeEach(() => { mockFetch.mockReset(); global.fetch = mockFetch; });

it("shows a loading state without inventing zero revenue or orders", () => {
  mockFetch.mockReturnValue(new Promise(() => undefined));
  render(<ConversionSummary />);
  expect(screen.getByRole("status")).toHaveTextContent("正在加载统计数据");
  expect(screen.getByRole("button", { name: "加载中…" })).toBeDisabled();
  expect(screen.queryByRole("definition")).not.toBeInTheDocument();
});
it("aggregates payment, delivery and experiment metrics and keeps the statistics scope explicit", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => data });
  render(<ConversionSummary />);
  await screen.findByText("$19.97");
  for (const [label, value] of [["已履约付款订单", "3"], ["已履约收款（美元）", "$19.97"], ["生成完成", "26"], ["付费生成完成", "9"], ["高清重制完成", "5"], ["实验预览完成", "12"], ["单张付款订单", "1"], ["积分解锁结果", "3"], ["已解锁结果下载请求", "3"], ["付款交付异常", "1"]]) {
    expect(within(screen.getByText(label).parentElement!).getByRole("definition")).toHaveTextContent(value);
  }
  expect(screen.getByText(/从本次统计功能上线开始记录/)).toHaveTextContent("UTC");
  expect(screen.getByText(/金额未扣除退款/)).toHaveTextContent("并非独立用户数或付费转化率");
  expect(mockFetch).toHaveBeenCalledWith("/api/internal/admin/conversions?days=14", expect.objectContaining({ cache: "no-store" }));
});
it.each(["http", "network", "invalid"])("shows a retryable failure without fabricated zeroes for %s errors", async (kind) => {
  if (kind === "network") mockFetch.mockRejectedValueOnce(new Error("offline"));
  else mockFetch.mockResolvedValueOnce({ ok: kind !== "http", json: async () => ({ ...data, daily: [{ date: "2026-10-07", purchases: "2" }] }) });
  render(<ConversionSummary />);
  expect(await screen.findByRole("alert")).toHaveTextContent("暂时无法加载统计数据");
  expect(screen.queryByRole("definition")).not.toBeInTheDocument();
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => data });
  fireEvent.click(screen.getByRole("button", { name: "刷新统计" }));
  await screen.findByText("$19.97");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("does not present old totals as current when refresh fails", async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => data });
  render(<ConversionSummary />);
  await screen.findByText("$19.97");
  mockFetch.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "刷新统计" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("$19.97")).not.toBeInTheDocument();
});
it.each([true, false])("mounts statistics only when admin authentication is ready: %s", async (authenticated) => {
  mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes("/session") ? { configured: true, authenticated } : url.includes("/users") ? { users: [] } : data }));
  render(<AdminPanel />);
  if (authenticated) await screen.findByRole("heading", { name: "近 14 天付费与交付" });
  else await screen.findByRole("button", { name: "解锁管理面板" });
  await waitFor(() => expect(mockFetch.mock.calls.some(([url]) => url.includes("/conversions"))).toBe(authenticated));
});
