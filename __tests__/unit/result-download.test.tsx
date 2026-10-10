/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
jest.mock("next-intl", () => ({ useLocale: () => "en" }));
import ResultDownload from "@/components/ResultDownload";
it("never sells a new unlock for a historical preview", () => {
  const fetch = jest.fn(); global.fetch = fetch;
  render(<ResultDownload taskId="photo-1" quota={null} unlocked={false} workflow="animate" onUnlocked={jest.fn()} />);
  expect(screen.getByRole("link", { name: "Upload a photo" })).toHaveAttribute("href", "/#upload-section");
  expect(screen.getByText(/New purchases for this earlier preview are closed/)).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves the confirmation for historically purchased results", () => {
  render(<ResultDownload taskId="photo-1" quota={null} unlocked workflow="animate" onUnlocked={jest.fn()} />);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByRole("heading")).toHaveTextContent(/unlocked/i);
});
