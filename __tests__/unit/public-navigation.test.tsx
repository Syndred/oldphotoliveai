/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockNextRouter = { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), refresh: jest.fn(), back: jest.fn(), forward: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => mockNextRouter }));
jest.mock("next-intl", () => ({ useLocale: () => "zh" }));
jest.mock("next-intl/navigation", () => ({ createNavigation: () => ({ usePathname: () => "/" }) }));
// Import the real module by relative path, bypassing the suite's navigation mock.
import { Link, useRouter } from "../../src/i18n/navigation";

beforeEach(() => jest.clearAllMocks());

describe("final-page navigation wrapper", () => {
  it("uses Next Link and retains ref, query, hash and explicit locale", () => {
    const ref = React.createRef<HTMLAnchorElement>();
    render(<Link href={{ pathname: "/zh/colorize-old-photos", query: { source: "menu" }, hash: "upload" }} locale="en" ref={ref} prefetch={false}>Colorize</Link>);
    expect(screen.getByRole("link", { name: "Colorize" })).toHaveAttribute("href", "/colorize-old-photos?source=menu#upload");
    expect(ref.current).toBe(screen.getByRole("link", { name: "Colorize" }));
  });

  it("links translated and secondary content directly while keeping external URLs", () => {
    render(<><Link href="/pricing?orderId=123">Pricing</Link><Link href="/restore-old-photos">Restore</Link><Link href="https://example.com/privacy" target="_blank">External</Link></>);
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/zh/pricing?orderId=123");
    expect(screen.getByRole("link", { name: "Restore" })).toHaveAttribute("href", "/restore-old-photos");
    expect(screen.getByRole("link", { name: "External" })).toHaveAttribute("href", "https://example.com/privacy");
  });

  it("routes pushes and prefetches to final paths without passing locale to Next", () => {
    function RouterProbe() {
      const router = useRouter();
      router.push("/restore?source=checkout", { scroll: false });
      router.replace("/result/task-123?token=abc", { locale: "es", scroll: false });
      router.prefetch("/pricing", { locale: "zh" });
      return null;
    }
    render(<RouterProbe />);
    expect(mockNextRouter.push).toHaveBeenCalledWith("/restore-old-photos?source=checkout", { scroll: false });
    expect(mockNextRouter.replace).toHaveBeenCalledWith("/result/task-123?token=abc", { scroll: false });
    expect(mockNextRouter.prefetch).toHaveBeenCalledWith("/zh/pricing");
  });
});
