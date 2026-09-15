/** @jest-environment jsdom */
import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockPathname = "/result/private-task-id";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

jest.mock("next/script", () => ({
  __esModule: true,
  default: ({ children, id }: { children?: React.ReactNode; id?: string }) => (
    <script data-testid={id}>{children}</script>
  ),
}));

import Analytics from "@/components/Analytics";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST",
    NEXT_PUBLIC_CLARITY_PROJECT_ID: "",
  };
  mockPathname = "/result/private-task-id";
  window.gtag = jest.fn();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

it("suppresses the raw initial page view and sends only a normalized result URL", async () => {
  mockPathname = "/en/result/private-task-id?token=secret#preview";
  const { getByTestId } = render(<Analytics />);

  expect(getByTestId("ga4-init").textContent).toContain("send_page_view: false");
  await waitFor(() => {
    expect(window.gtag).toHaveBeenCalledWith("config", "G-TEST", {
      page_path: "/en/result/:taskId",
      page_location: "http://localhost/en/result/:taskId",
    });
  });
  const calls = JSON.stringify((window.gtag as jest.Mock).mock.calls);
  expect(calls).not.toContain("private-task-id");
  expect(calls).not.toContain("token=secret");
  expect(calls).not.toContain("#preview");
});

it("waits for the analytics bootstrap before sending the sanitized page view", async () => {
  window.gtag = undefined;
  render(<Analytics />);

  window.gtag = jest.fn();
  window.dispatchEvent(new Event("opla-ga-ready"));

  await waitFor(() => {
    expect(window.gtag).toHaveBeenCalledWith(
      "config",
      "G-TEST",
      expect.objectContaining({ page_path: "/result/:taskId" })
    );
  });
});
