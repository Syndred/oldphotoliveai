/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-auth/react
const mockUseSession = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock next-intl
const mockUseLocale = jest.fn();
jest.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, Record<string, string>> = {
      nav: {
        home: "Home",
        history: "History",
        pricing: "Pricing",
        login: "Sign In",
        logout: "Sign Out",
      },
      pricing: { free: "Free", payAsYouGo: "Pay As You Go", professional: "Professional", currentPlan: "Current Plan" },
      quota: { remaining: "{count} remaining" },
    };
    let value = translations[namespace]?.[key] ?? key;
    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }
    return value;
  },
  useLocale: () => mockUseLocale(),
}));

import AuthButton from "@/components/AuthButton";
import Navbar from "@/components/Navbar";
import {
  __resetI18nNavigationMocks,
  __setMockLocale,
  __setMockPathname,
} from "../helpers/i18n-navigation";

function getRequestUrl(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (
    input &&
    typeof input === "object" &&
    "url" in input &&
    typeof (input as { url: unknown }).url === "string"
  ) {
    return (input as { url: string }).url;
  }
  return String(input);
}

describe("AuthButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetI18nNavigationMocks();
    __setMockLocale("en");
    __setMockPathname("/");
    mockUseLocale.mockReturnValue("en");
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        userId: "u1",
        tier: "free",
        remaining: 1,
        dailyLimit: 1,
        resetAt: null,
        credits: 0,
        creditsExpireAt: null,
      }),
    })) as jest.Mock;
  });

  it("shows loading skeleton when session is loading", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });
    const { container } = render(<AuthButton />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("shows Sign In button when not authenticated", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<AuthButton />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("calls signIn with google when Sign In is clicked", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<AuthButton />);
    screen.getByText("Sign In").click();
    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/en",
    });
  });

  it("shows user info and Sign Out when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.jpg",
        },
      },
      status: "authenticated",
    });
    render(<AuthButton />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
    expect(screen.getByAltText("Test User")).toBeInTheDocument();
  });

  it("calls signOut when Sign Out is clicked", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com", image: null },
      },
      status: "authenticated",
    });
    render(<AuthButton />);
    screen.getByText("Sign Out").click();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("handles user without avatar image", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "No Avatar", email: "test@example.com", image: null },
      },
      status: "authenticated",
    });
    render(<AuthButton />);
    expect(screen.getByText("No Avatar")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetI18nNavigationMocks();
    __setMockLocale("en");
    __setMockPathname("/");
    mockUseLocale.mockReturnValue("en");
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    global.fetch = jest.fn(async (input: unknown) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/api/quota")) {
        return {
          ok: true,
          json: async () => ({
            userId: "u1",
            tier: "professional",
            remaining: 0,
            dailyLimit: null,
            resetAt: null,
            credits: 0,
            creditsExpireAt: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as jest.Mock;
  });

  it("renders the logo text", () => {
    __setMockPathname("/");
    render(<Navbar />);
    expect(screen.getByText("OldPhotoLive AI")).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    __setMockPathname("/");
    render(<Navbar />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.queryByText("History")).not.toBeInTheDocument();
  });

  it("links point to correct routes", () => {
    __setMockPathname("/");
    render(<Navbar />);
    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/en");
    expect(screen.getByText("Pricing").closest("a")).toHaveAttribute(
      "href",
      "/en/pricing"
    );
  });

  it("highlights active Home link when on /", () => {
    __setMockPathname("/");
    render(<Navbar />);
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.className).toContain("text-white");
  });

  it("highlights active History link when on /history", () => {
    __setMockPathname("/history");
    mockUseSession.mockReturnValue({
      data: { user: { name: "History User", email: "history@example.com" } },
      status: "authenticated",
    });
    render(<Navbar />);
    const historyLink = screen.getByText("History").closest("a");
    // Active link has "text-white" as a standalone class (not just in hover:text-white)
    expect(historyLink?.className).toMatch(/(?<![:\w-])text-white(?!\S)/);
    const homeLink = screen.getByText("Home").closest("a");
    // Home should have the secondary text color, not the active white
    expect(homeLink?.className).toContain("text-[var(--color-text-secondary)]");
  });

  it("includes AuthButton", () => {
    __setMockPathname("/");
    render(<Navbar />);
    // AuthButton renders Sign In when unauthenticated
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows History link for authenticated users", () => {
    __setMockPathname("/");
    mockUseSession.mockReturnValue({
      data: { user: { name: "Paid User", email: "paid@example.com" } },
      status: "authenticated",
    });

    render(<Navbar />);
    expect(screen.getByText("History").closest("a")).toHaveAttribute(
      "href",
      "/en/history"
    );
  });

  it("shows themed tier badge next to username for authenticated user", () => {
    __setMockPathname("/");
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Paid User", email: "paid@example.com", tier: "professional" },
      },
      status: "authenticated",
    });

    render(<Navbar />);
    expect(screen.getByText("Paid User")).toBeInTheDocument();
    expect(screen.getByTestId("auth-tier-badge")).toHaveTextContent("Professional");
  });

  it("shows tier badge in mobile menu when expanded", () => {
    __setMockPathname("/");
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Paid User", email: "paid@example.com", tier: "professional" },
      },
      status: "authenticated",
    });

    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
    expect(screen.getByTestId("tier-badge-mobile")).toHaveTextContent(
      "Current Plan: Professional"
    );
  });

  it("shows pay-as-you-go remaining count in tier badge", async () => {
    __setMockPathname("/");
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Payg User", email: "payg@example.com", tier: "pay_as_you_go" },
      },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockImplementation(async (input: unknown) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/api/quota")) {
        return {
          ok: true,
          json: async () => ({
            userId: "u1",
            tier: "pay_as_you_go",
            remaining: 3,
            dailyLimit: null,
            resetAt: null,
            credits: 3,
            creditsExpireAt: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<Navbar />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-tier-badge")).toHaveTextContent(
        "Pay As You Go | 3 remaining"
      );
    });
  });

  it("logo links to home page", () => {
    __setMockPathname("/pricing");
    render(<Navbar />);
    const logo = screen.getByText("OldPhotoLive AI").closest("a");
    expect(logo).toHaveAttribute("href", "/en");
  });
});
