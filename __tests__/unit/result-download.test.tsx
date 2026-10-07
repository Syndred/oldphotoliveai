/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { QuotaInfo } from "@/types";
const mockFetch = jest.fn();
jest.mock("next-intl", () => ({ useLocale: () => "en" }));
jest.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: jest.fn(), trackTaskEventOnce: jest.fn() }));
import ResultDownload from "@/components/ResultDownload";
beforeEach(() => { jest.clearAllMocks(); global.fetch = mockFetch; });
it("sells the same result and states that 480p is not an HD upgrade", () => {
  render(<ResultDownload taskId="photo-1" quota={null} unlocked={false} workflow="animate" onUnlocked={jest.fn()} />);
  expect(screen.getByRole("link", { name: "Unlock this result — $1.99" })).toHaveAttribute("href", "/pricing?taskId=photo-1&plan=single_photo");
  expect(screen.getByText(/this is not an HD upgrade/)).toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
});
it("deduplicates repeated unlock clicks and refreshes the confirmed result", async () => {
  let finish!: (value: unknown) => void;
  mockFetch.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const confirmed = jest.fn();
  render(<ResultDownload taskId="photo-1" quota={{ tier: "pay_as_you_go", credits: 1 } as QuotaInfo} unlocked={false} workflow="animate" onUnlocked={confirmed} />);
  const button = screen.getByRole("button", { name: "Unlock this result — 1 credit" });
  fireEvent.click(button); fireEvent.click(button);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith("/api/tasks/photo-1/unlock", { method: "POST" });
  await act(async () => finish({ ok: true, json: async () => ({ unlocked: true }) }));
  expect(confirmed).toHaveBeenCalledTimes(1);
});
it("does not claim an unlock after a rejected or ambiguous response", async () => {
  const confirmed = jest.fn();
  mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
  render(<ResultDownload taskId="photo-1" quota={{ tier: "pay_as_you_go", credits: 1 } as QuotaInfo} unlocked={false} workflow="animate" onUnlocked={confirmed} />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("before making another purchase");
  expect(confirmed).not.toHaveBeenCalled();
});
it("offers checkout after the account has no remaining credits", async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ code: "NO_CREDITS" }) });
  render(<ResultDownload taskId="photo-1" quota={{ tier: "pay_as_you_go", credits: 1 } as QuotaInfo} unlocked={false} workflow="animate" onUnlocked={jest.fn()} />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(screen.getByRole("link", { name: "Unlock this result — $1.99" })).toBeInTheDocument());
});
it("does not offer another charge once the result is unlocked", () => {
  render(<ResultDownload taskId="photo-1" quota={null} unlocked workflow="animate" onUnlocked={jest.fn()} />);
  expect(screen.getByText("This result is unlocked")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("requires the server unlock flag before refreshing access", async () => {
  const confirmed = jest.fn();
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  render(<ResultDownload taskId="photo-1" quota={{ tier: "pay_as_you_go", credits: 1 } as QuotaInfo} unlocked={false} workflow="animate" onUnlocked={confirmed} />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(confirmed).not.toHaveBeenCalled();
});

it("does not describe a still-image result as a 480p video or an HD upgrade", () => {
  render(<ResultDownload taskId="photo-1" quota={null} unlocked={false} workflow="restore" onUnlocked={jest.fn()} />);
  expect(screen.getByText(/No AI regeneration or increase in resolution/)).toBeInTheDocument();
  expect(screen.queryByText(/480p/)).not.toBeInTheDocument();
});

it("routes an ambiguous checkout to support without claiming payment or offering another purchase", async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ code: "CHECKOUT_REVIEW_REQUIRED" }) });
  render(<ResultDownload taskId="photo-1" quota={{ tier: "pay_as_you_go", credits: 1 } as QuotaInfo} unlocked={false} workflow="animate" onUnlocked={jest.fn()} />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("payment status");
  expect(screen.getByRole("link", { name: /Contact support/ })).toHaveAttribute("href", "mailto:support@oldphotoliveai.com");
  expect(screen.queryByRole("link", { name: "Unlock this result — $1.99" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
