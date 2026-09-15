/** @jest-environment jsdom */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const taskId = "private-task-rest-completed";
const mockTranslate = (key: string) => key;

jest.mock("next/navigation", () => ({
  useParams: () => ({ taskId }),
}));
jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));
jest.mock("next-intl", () => ({
  useTranslations: () => mockTranslate,
}));
jest.mock("@/components/Navbar", () => () => <nav />);
jest.mock("@/components/ProgressIndicator", () => () => <div />);
jest.mock("@/components/BeforeAfterCompare", () => () => (
  <div data-testid="completed-result" />
));
jest.mock("@/components/VideoPlayer", () => () => <div />);

import ResultPage from "@/app/result/[taskId]/page";

const originalEnv = process.env;
const originalFetch = global.fetch;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST",
    NEXT_PUBLIC_CLARITY_PROJECT_ID: "",
  };
  localStorage.clear();
  window.gtag = undefined;
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url === "/api/quota") {
      return Promise.resolve({ ok: true, json: async () => ({ tier: "free" }) });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({
        status: "completed",
        workflow: "full",
        accessMode: "authenticated",
        attemptCount: 1,
        originalImageKey: "uploads/original.jpg",
        colorizedImageKey: "results/colorized.jpg",
      }),
    });
  });
});

afterAll(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
});

it("replays one completed lifecycle from REST after GA loads without leaking the task id", async () => {
  render(<ResultPage />);

  await waitFor(() => {
    expect(screen.getByTestId("completed-result")).toBeInTheDocument();
  });
  expect(global.fetch).toHaveBeenCalledTimes(2);

  window.gtag = jest.fn();
  window.dispatchEvent(new Event("opla-ga-ready"));

  await waitFor(() => expect(window.gtag).toHaveBeenCalledTimes(2));
  expect(window.gtag).toHaveBeenCalledWith("event", "generation_completed", {
    workflow: "full",
    access_mode: "authenticated",
    attempt: 1,
  });
  expect(window.gtag).toHaveBeenCalledWith("event", "result_view", {
    workflow: "full",
    access_mode: "authenticated",
    attempt: 1,
  });
  expect(JSON.stringify((window.gtag as jest.Mock).mock.calls)).not.toContain(taskId);

  window.dispatchEvent(new Event("opla-ga-ready"));
  expect(window.gtag).toHaveBeenCalledTimes(2);
});
