/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { mockRouterPush, __resetI18nNavigationMocks } from "../helpers/i18n-navigation";
import type { QuotaInfo } from "@/types";
const mockFetch = jest.fn();
const mockTranslate = (key: string) => key;
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => mockTranslate }));
jest.mock("next/navigation", () => ({ useParams: () => ({ taskId: "source-task" }) }));
jest.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: jest.fn(), trackTaskEventOnce: jest.fn() }));
jest.mock("@/components/Navbar", () => () => <nav />);
jest.mock("@/components/ProgressIndicator", () => () => <div>Processing</div>);
jest.mock("@/components/BeforeAfterCompare", () => () => <div>Comparison</div>);
jest.mock("@/components/VideoPlayer", () => ({ showWatermark }: { showWatermark: boolean }) => <div data-testid="video" data-watermark={String(showWatermark)} />);
import ResultUpgrade from "@/components/ResultUpgrade";
import ResultPage from "@/app/result/[taskId]/page";
const quota = { tier: "pay_as_you_go", credits: 4 } as QuotaInfo;
beforeEach(() => { jest.clearAllMocks(); __resetI18nNavigationMocks(); global.fetch = mockFetch; });

it.each([null, { tier: "free", credits: 0 } as QuotaInfo])("carries the original result into Starter Pack purchase with quota %j", (current) => {
  render(<ResultUpgrade taskId="source-task" quota={current} workflow="restore" />);
  expect(screen.getByRole("link", { name: /Create an HD version/ })).toHaveAttribute("href", "/pricing?taskId=source-task&plan=starter_pack");
  expect(mockFetch).not.toHaveBeenCalled();
});
it("requires an explicit one-credit action and blocks concurrent double clicks", async () => {
  let finish!: (response: unknown) => void;
  mockFetch.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<ResultUpgrade taskId="source-task" quota={quota} workflow="restore" />);
  const button = screen.getByRole("button", { name: "Create HD version — 1 credit" });
  expect(mockFetch).not.toHaveBeenCalled();
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith("/api/tasks/source-task/upgrade", { method: "POST" });
  await act(async () => finish({ ok: true, json: async () => ({ taskId: "hd-task", replayed: false }) }));
  expect(mockRouterPush).toHaveBeenCalledWith("/result/hd-task");
});
it.each(["PAYMENT_REQUIRED", "NO_CREDITS"])("switches stale paid quota to purchasing on %s", async (code) => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ code }) });
  render(<ResultUpgrade taskId="source-task" quota={quota} workflow="restore" />);
  fireEvent.click(screen.getByRole("button", { name: "Create HD version — 1 credit" }));
  expect(await screen.findByRole("link", { name: /Create an HD version/ })).toHaveAttribute("href", expect.stringContaining("taskId=source-task"));
  expect(mockRouterPush).not.toHaveBeenCalled();
});
it("does not promise a per-credit charge to professional accounts", () => {
  render(<ResultUpgrade taskId="source-task" quota={{ ...quota, tier: "professional" }} workflow="restore" />);
  expect(screen.getByRole("button", { name: "Create HD version" })).toBeInTheDocument();
});
it.each([
  { accessMode: "anonymous", generationTier: "free", canUpgrade: true, watermark: "true" },
  { accessMode: "authenticated", generationTier: "free", canUpgrade: true, watermark: "true" },
  { accessMode: "authenticated", generationTier: "pay_as_you_go", canUpgrade: false, watermark: "false" },
])("renders quality from task generation tier, not upgraded account: %j", async (state) => {
  mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url === "/api/quota" ? quota : {
    ...state, status: "completed", workflow: "animate", originalImageKey: "tasks/source/original.jpg", restoredImageKey: "tasks/source/restored.jpg", animationVideoKey: "tasks/source/video.mp4",
  } }));
  render(<ResultPage />);
  expect(await screen.findByTestId("video")).toHaveAttribute("data-watermark", state.watermark);
  await waitFor(() => expect(Boolean(screen.queryByRole("heading", { name: "Keep this photo in higher quality" }))).toBe(state.canUpgrade));
  expect(mockFetch.mock.calls.every(([url]) => !String(url).endsWith("/upgrade"))).toBe(true);
});

it("recovers an already charged HD job after the last credit and a lost response", async () => {
  mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url === "/api/quota" ? { ...quota, credits: 0 } : {
    status: "completed", workflow: "restore", generationTier: "free", canUpgrade: true,
    originalImageKey: "private-source", restoredImageKey: "preview", existingUpgradeTaskId: "already-paid-hd",
  } }));
  render(<ResultPage />);
  const link = await screen.findByRole("link", { name: "Open your HD version — no extra credit" });
  expect(link).toHaveAttribute("href", "/result/already-paid-hd");
  expect(screen.queryByRole("link", { name: /Create an HD version/ })).not.toBeInTheDocument();
  expect(mockFetch.mock.calls.every(([url]) => !String(url).endsWith("/upgrade"))).toBe(true);
});
