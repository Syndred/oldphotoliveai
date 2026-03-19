/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockUseLocale = jest.fn();
const mockSearchParamsEntries = jest.fn();
const mockNavigateTo = jest.fn();

jest.mock("next-intl", () => ({
  useLocale: () => mockUseLocale(),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    entries: () => mockSearchParamsEntries(),
  }),
}));

jest.mock("@/lib/browser", () => ({
  navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
  reloadPage: jest.fn(),
}));

import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  __resetI18nNavigationMocks,
  __setMockLocale,
  __setMockPathname,
} from "../helpers/i18n-navigation";

beforeEach(() => {
  jest.clearAllMocks();
  __resetI18nNavigationMocks();
  __setMockLocale("en");
  __setMockPathname("/pricing");
  mockUseLocale.mockReturnValue("en");
  mockSearchParamsEntries.mockReturnValue([]);
  document.cookie = "";
});

describe("LanguageSwitcher", () => {
  it("renders the current locale label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("renders the zh locale label correctly", () => {
    __setMockLocale("zh");
    mockUseLocale.mockReturnValue("zh");

    render(<LanguageSwitcher />);

    expect(screen.getByText("\u7b80\u4f53\u4e2d\u6587")).toBeInTheDocument();
  });

  it("opens a menu with four language options", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));

    expect(
      screen.getByRole("menu", { name: "Language options" })
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "English" })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", {
        name: "\u7b80\u4f53\u4e2d\u6587",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Espa\u00f1ol" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "\u65e5\u672c\u8a9e" })
    ).toBeInTheDocument();
  });

  it("marks the current locale as selected", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));

    expect(
      screen.getByRole("menuitemradio", { name: "English" })
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("menuitemradio", {
        name: "\u7b80\u4f53\u4e2d\u6587",
      })
    ).toHaveAttribute("aria-checked", "false");
  });

  it("navigates to the localized route when switching locale", () => {
    mockSearchParamsEntries.mockReturnValue([["tab", "billing"]]);
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: "Espa\u00f1ol" })
    );

    expect(mockNavigateTo).toHaveBeenCalledWith("/es/pricing?tab=billing");
    expect(document.cookie).toContain("NEXT_LOCALE=es");
  });

  it("closes the menu without navigation when clicking the current locale", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(mockNavigateTo).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("menu", { name: "Language options" })
    ).not.toBeInTheDocument();
  });

  it("closes the menu on outside click", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <LanguageSwitcher />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open language menu" }));
    expect(
      screen.getByRole("menu", { name: "Language options" })
    ).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(
      screen.queryByRole("menu", { name: "Language options" })
    ).not.toBeInTheDocument();
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
