/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-intl
const mockUseLocale = jest.fn();
jest.mock("next-intl", () => ({
  useLocale: () => mockUseLocale(),
}));

// Mock the reloadPage function used by LanguageSwitcher
const mockReload = jest.fn();
jest.mock("@/lib/browser", () => ({
  reloadPage: (...args: unknown[]) => mockReload(...args),
}));

import LanguageSwitcher from "@/components/LanguageSwitcher";

beforeEach(() => {
  jest.clearAllMocks();
  document.cookie = "NEXT_LOCALE=; max-age=0";
  mockUseLocale.mockReturnValue("en");
});

describe("LanguageSwitcher", () => {
  it("renders current locale label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("renders 中文 label when locale is zh", () => {
    mockUseLocale.mockReturnValue("zh");
    render(<LanguageSwitcher />);
    expect(screen.getByText("中文")).toBeInTheDocument();
  });

  it("shows dropdown with other locale on click", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("EN"));
    expect(screen.getByText("中文")).toBeInTheDocument();
  });

  it("does not show current locale in dropdown options", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("EN"));
    const buttons = screen.getAllByRole("button");
    // One toggle button + one option
    expect(buttons).toHaveLength(2);
  });

  it("sets cookie and reloads when switching locale", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("EN"));
    fireEvent.click(screen.getByText("中文"));
    expect(document.cookie).toContain("NEXT_LOCALE=zh");
    expect(mockReload).toHaveBeenCalled();
  });

  it("does not reload when no switch happens", () => {
    render(<LanguageSwitcher />);
    // Just rendering and not clicking anything should not trigger reload
    expect(mockReload).not.toHaveBeenCalled();
  });

  it("closes dropdown on outside click", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <LanguageSwitcher />
      </div>
    );
    fireEvent.click(screen.getByText("EN"));
    expect(screen.getByText("中文")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
  });

  it("has correct aria attributes", () => {
    render(<LanguageSwitcher />);
    const button = screen.getByLabelText("Switch language");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles dropdown open and closed", () => {
    render(<LanguageSwitcher />);
    const toggle = screen.getByText("EN");
    fireEvent.click(toggle);
    expect(screen.getByText("中文")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
  });
});
