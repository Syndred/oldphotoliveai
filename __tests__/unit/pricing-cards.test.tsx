/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-auth/react (needed by Navbar/AuthButton/PricingCards)
const mockUseSession = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock next-intl (needed by LanguageSwitcher and PricingCards)
jest.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, Record<string, string>> = {
      pricing: {
        title: "Choose Your Plan", subtitle: "Unlock the full power of AI photo restoration",
        free: "Free", payAsYouGo: "Pay As You Go", professional: "Professional",
        recommended: "Recommended", currentPlan: "Current Plan", subscribe: "Subscribe",
        buyCredits: "Buy Credits", redirecting: "Redirecting…",
        freeDesc: "Try it out", payAsYouGoDesc: "For occasional use", professionalDesc: "Best value",
        freeFeature1: "1 photo per day", freeFeature2: "Low resolution (800×600)", freeFeature3: "Watermark on output",
        payFeature1: "5 credits", payFeature2: "High resolution (1920×1080)", payFeature3: "No watermark",
        proFeature1: "Unlimited photos", proFeature2: "High resolution (1920×1080)", proFeature3: "No watermark", proFeature4: "Priority processing",
      },
      errors: {
        checkoutFailed: "Checkout failed",
        paymentUnavailable: "Payment feature is currently unavailable.",
      },
      quota: { remaining: "{count} remaining" },
      nav: { home: "Home", history: "History", pricing: "Pricing", login: "Sign In", logout: "Sign Out" },
    };
    let value = translations[namespace]?.[key] ?? key;
    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }
    return value;
  },
  useLocale: () => "en",
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/pricing",
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import PricingCards from "@/components/PricingCards";
import PricingPage from "@/app/pricing/page";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

describe("PricingCards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  it("renders three pricing plans", () => {
    render(<PricingCards />);
    expect(screen.getByTestId("plan-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-pay_as_you_go")).toBeInTheDocument();
    expect(screen.getByTestId("plan-professional")).toBeInTheDocument();
  });

  it("displays correct plan names", () => {
    render(<PricingCards />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pay As You Go")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
  });

  it("displays correct prices", () => {
    render(<PricingCards />);
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$4.99")).toBeInTheDocument();
    expect(screen.getByText("$9.99")).toBeInTheDocument();
  });

  it("shows Recommended badge on Professional plan", () => {
    render(<PricingCards />);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("shows Current Plan for free tier (not a button)", () => {
    render(<PricingCards />);
    const currentPlan = screen.getByText("Current Plan");
    expect(currentPlan.tagName).toBe("SPAN");
  });

  it("shows Current Plan on professional card for professional users", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Pro User", tier: "professional" } },
      status: "authenticated",
    });

    render(<PricingCards />);

    const professionalCard = screen.getByTestId("plan-professional");
    expect(professionalCard).toHaveTextContent("Current Plan");
    expect(screen.queryByText("Subscribe")).not.toBeInTheDocument();
  });

  it("shows Buy Credits button for pay-as-you-go", () => {
    render(<PricingCards />);
    const btn = screen.getByText("Buy Credits");
    expect(btn.tagName).toBe("BUTTON");
  });

  it("shows Subscribe button for professional", () => {
    render(<PricingCards />);
    const btn = screen.getByText("Subscribe");
    expect(btn.tagName).toBe("BUTTON");
  });

  it("displays features for each plan", () => {
    render(<PricingCards />);
    expect(screen.getByText("1 photo per day")).toBeInTheDocument();
    expect(screen.getByText("5 credits")).toBeInTheDocument();
    expect(screen.getByText("Unlimited photos")).toBeInTheDocument();
    expect(screen.getByText("Priority processing")).toBeInTheDocument();
  });

  it("calls checkout API with correct plan when Buy Credits is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session123" }),
    });

    render(<PricingCards />);
    fireEvent.click(screen.getByText("Buy Credits"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pay_as_you_go" }),
      });
    });
  });

  it("calls checkout API with professional plan when Subscribe is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session456" }),
    });

    render(<PricingCards />);
    fireEvent.click(screen.getByText("Subscribe"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "professional" }),
      });
    });
  });

  it("shows error message when checkout fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });

    render(<PricingCards />);

    await act(async () => {
      fireEvent.click(screen.getByText("Subscribe"));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unauthorized");
    });
  });

  it("shows loading state during checkout", async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(promise);

    render(<PricingCards />);
    fireEvent.click(screen.getByText("Subscribe"));

    expect(screen.getByText("Redirecting…")).toBeInTheDocument();

    resolvePromise!({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/test" }),
    });
  });
});

describe("PricingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    mockFetch.mockImplementation(async (input: unknown) => {
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
    });
  });

  it("renders the page title", () => {
    render(<PricingPage />);
    expect(screen.getByText("Choose Your Plan")).toBeInTheDocument();
  });

  it("renders the Navbar", () => {
    render(<PricingPage />);
    expect(screen.getByText("OldPhotoLive AI")).toBeInTheDocument();
  });

  it("renders PricingCards component", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("plan-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-professional")).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    render(<PricingPage />);
    expect(
      screen.getByText("Unlock the full power of AI photo restoration")
    ).toBeInTheDocument();
  });

  it("shows current plan summary for authenticated users", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Pro User", tier: "professional" } },
      status: "authenticated",
    });

    render(<PricingPage />);
    expect(screen.getByTestId("current-plan-summary")).toHaveTextContent(
      "Current Plan: Professional"
    );
  });

  it("does not show current plan summary for unauthenticated users", () => {
    render(<PricingPage />);
    expect(screen.queryByTestId("current-plan-summary")).not.toBeInTheDocument();
  });

  it("shows pay-as-you-go remaining credits in summary", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Payg User", tier: "pay_as_you_go" } },
      status: "authenticated",
    });
    mockFetch.mockImplementation(async (input: unknown) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/api/quota")) {
        return {
          ok: true,
          json: async () => ({
            userId: "u1",
            tier: "pay_as_you_go",
            remaining: 2,
            dailyLimit: null,
            resetAt: null,
            credits: 2,
            creditsExpireAt: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<PricingPage />);
    await waitFor(() => {
      expect(screen.getByTestId("current-plan-summary")).toHaveTextContent(
        /Current Plan:\s*Pay As You Go\s*\(2 remaining\)/
      );
    });
  });
});
