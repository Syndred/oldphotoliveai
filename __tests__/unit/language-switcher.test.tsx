/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockUseLocale = jest.fn();
jest.mock("next-intl", () => ({
  useLocale: () => mockUseLocale(),
}));

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
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("renders current locale label for zh", () => {
    mockUseLocale.mockReturnValue("zh");
    render(<LanguageSwitcher />);
    expect(screen.getByText("中文")).toBeInTheDocument();
  });

  it("opens a themed menu with four language options", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));

    expect(screen.getByRole("menu", { name: "Language options" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "中文" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "日本語" })).toBeInTheDocument();
  });

  it("marks the current locale as selected", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));

    expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("menuitemradio", { name: "中文" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("sets cookie and reloads when switching locale", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Español" }));

    expect(document.cookie).toContain("NEXT_LOCALE=es");
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("closes the menu without reloading when clicking the current locale", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(mockReload).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu", { name: "Language options" })).not.toBeInTheDocument();
  });

  it("closes the menu on outside click", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <LanguageSwitcher />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));
    expect(screen.getByRole("menu", { name: "Language options" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.queryByRole("menu", { name: "Language options" })).not.toBeInTheDocument();
  });

  it("updates aria-expanded as the menu opens and closes", () => {
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", { name: "Open language menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
