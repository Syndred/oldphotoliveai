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
          eyebrow: "One-time credit packs",
          title: "Pay Once, Restore When You Need",
          subtitle:
            "Start free, then buy credits only when a result is worth keeping.",
          valueProp1: "Free daily trial",
          valueProp2: "HD exports",
          valueProp3: "Credits valid for 1 year",
          free: "Free",
          payAsYouGo: "Pay As You Go",
          professional: "Professional",
          starterPack: "Starter Pack",
          familyPack: "Family Pack",
          archivePack: "Archive Pack",
          recommended: "Recommended",
          currentPlan: "Current Plan",
          subscribe: "Subscribe",
          buyCredits: "Buy Credits",
          buyPack: "Buy Credits",
          includedInProfessional: "Included in Professional",
          manageSubscription: "Manage Subscription",
          scheduledCancellation:
            "Scheduled to downgrade to Free on {date} at period end.",
          redirecting: "Redirecting...",
          freeBadge: "Start here",
          starterPackBadge: "Try a few",
          familyPackBadge: "Most popular",
          archivePackBadge: "Best value",
          professionalBadge: "Best for archives",
          creditPackPeriod: "/ {count} credits",
          freePriceNote: "Daily free credit for testing the workflow.",
          starterPackPriceNote: "Good for testing a few important photos.",
          familyPackPriceNote: "Lower friction for a small family album.",
          archivePackPriceNote: "Best per-photo value for batches.",
          professionalPriceNote:
            "Monthly plan for albums, batches, and client work.",
          freeDesc: "Preview the restoration workflow before paying.",
          starterPackDesc: "A low-risk pack for first purchases.",
          familyPackDesc: "Enough credits for a keepsake set or gift.",
          archivePackDesc:
            "Process a larger batch at a lower per-credit cost.",
          professionalDesc: "Best value",
          freeFeature1: "1 photo per day",
          freeFeature2: "Image export up to 800x600",
          freeFeature3: "480p video output",
          freeFeature4: "Watermark on image output",
          starterPackFeature1: "10 paid credits",
          starterPackFeature2: "2K image export (up to 2048px)",
          starterPackFeature3: "720p HD video",
          starterPackFeature4: "Watermark-free downloads",
          familyPackFeature1: "25 paid credits",
          familyPackFeature2: "2K image export (up to 2048px)",
          familyPackFeature3: "720p HD video",
          familyPackFeature4: "Watermark-free downloads",
          archivePackFeature1: "60 paid credits",
          archivePackFeature2: "2K image export (up to 2048px)",
          archivePackFeature3: "720p HD video",
          archivePackFeature4: "Watermark-free downloads",
          payFeature1: "1 credit",
          payFeature2: "2K image export (up to 2048px)",
          payFeature3: "720p HD video",
          payFeature4: "No watermark",
          proFeature1: "Unlimited photos",
          proFeature2: "2K image export (up to 2048px)",
          proFeature3: "1080p premium video",
          proFeature4: "No watermark",
          proFeature5: "Priority processing",
        },
        errors: {
          checkoutFailed: "Checkout failed",
          billingPortalFailed: "Billing portal failed",
          paymentUnavailable: "Payment feature is currently unavailable.",
          professionalAlreadyIncludesCredits:
            "Professional already includes unlimited restorations. No extra credits are needed.",
        },
        quota: { remaining: "{count} remaining" },
        nav: {
          home: "Home",
          history: "History",
          pricing: "Pricing",
          login: "Sign In",
          logout: "Sign Out",
        },
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

jest.mock("@/components/Navbar", () => ({
  __esModule: true,
  default: () => <nav data-testid="navbar" />,
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

  it("renders free and credit-pack pricing plans", () => {
    render(<PricingCards />);
    expect(screen.getByTestId("plan-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-starter_pack")).toBeInTheDocument();
    expect(screen.getByTestId("plan-family_pack")).toBeInTheDocument();
    expect(screen.getByTestId("plan-archive_pack")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-professional")).not.toBeInTheDocument();
  });

  it("displays correct plan names", () => {
    render(<PricingCards />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Starter Pack")).toBeInTheDocument();
    expect(screen.getByText("Family Pack")).toBeInTheDocument();
    expect(screen.getByText("Archive Pack")).toBeInTheDocument();
  });

  it("displays correct prices", () => {
    render(<PricingCards />);
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$4.99")).toBeInTheDocument();
    expect(screen.getByText("$9.99")).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
  });

  it("shows Recommended badge on Family Pack", () => {
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

    render(<PricingCards hasActiveStripeSubscription />);

    const professionalCard = screen.getByTestId("plan-professional");
    expect(professionalCard).toHaveTextContent("Current Plan");
    expect(screen.getByText("Manage Subscription")).toBeInTheDocument();
    expect(screen.queryByText("Subscribe")).not.toBeInTheDocument();
  });

  it("does not show credit purchase buttons for professional users", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Pro User", tier: "professional" } },
      status: "authenticated",
    });

    render(<PricingCards />);

    const starterCard = screen.getByTestId("plan-starter_pack");
    expect(starterCard).toHaveTextContent("Included in Professional");
    expect(screen.queryByText("Buy Credits")).not.toBeInTheDocument();
  });

  it("opens the billing portal for professional users", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Pro User", tier: "professional" } },
      status: "authenticated",
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://billing.stripe.com/session-test" }),
    });

    render(<PricingCards hasActiveStripeSubscription />);

    await act(async () => {
      fireEvent.click(screen.getByText("Manage Subscription"));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/portal", {
        method: "POST",
      });
    });
  });

  it("still shows credit packs for pay-as-you-go users", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Payg User", tier: "pay_as_you_go" } },
      status: "authenticated",
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session-payg" }),
    });

    render(<PricingCards />);

    const familyPack = screen.getByTestId("plan-family_pack");
    expect(familyPack).not.toHaveTextContent("Current Plan");

    await act(async () => {
      fireEvent.click(screen.getAllByText("Buy Credits")[1]);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "family_pack" }),
      });
    });
  });

  it("shows Buy Credits buttons for credit packs", () => {
    render(<PricingCards />);
    const buttons = screen.getAllByText("Buy Credits");
    expect(buttons).toHaveLength(3);
    expect(buttons[0].tagName).toBe("BUTTON");
  });

  it("hides Subscribe button for new users", () => {
    render(<PricingCards />);
    expect(screen.queryByText("Subscribe")).not.toBeInTheDocument();
  });

  it("displays features for each plan", () => {
    render(<PricingCards />);
    expect(screen.getByText("1 photo per day")).toBeInTheDocument();
    expect(screen.getByText("10 paid credits")).toBeInTheDocument();
    expect(screen.getByText("25 paid credits")).toBeInTheDocument();
    expect(screen.getByText("60 paid credits")).toBeInTheDocument();
    expect(screen.getByText("480p video output")).toBeInTheDocument();
    expect(screen.getAllByText("720p HD video")).toHaveLength(3);
  });

  it("calls checkout API with the selected credit pack", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session123" }),
    });

    render(<PricingCards />);
    fireEvent.click(screen.getAllByText("Buy Credits")[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter_pack" }),
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
      fireEvent.click(screen.getAllByText("Buy Credits")[0]);
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
    fireEvent.click(screen.getAllByText("Buy Credits")[0]);

    expect(screen.getByText("Redirecting...")).toBeInTheDocument();

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
      if (url.endsWith("/api/stripe/subscription")) {
        return {
          ok: true,
          json: async () => ({
            hasActiveSubscription: true,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  it("renders the page title", () => {
    render(<PricingPage />);
    expect(screen.getByText("Pay Once, Restore When You Need")).toBeInTheDocument();
  });

  it("renders the Navbar", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("renders PricingCards component", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("plan-free")).toBeInTheDocument();
    expect(screen.getByTestId("plan-family_pack")).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    render(<PricingPage />);
    expect(
      screen.getByText(
        "Start free, then buy credits only when a result is worth keeping."
      )
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

  it("shows the scheduled downgrade date when a subscription is set to cancel", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Pro User", tier: "professional" } },
      status: "authenticated",
    });
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
      if (url.endsWith("/api/stripe/subscription")) {
        return {
          ok: true,
          json: async () => ({
            hasActiveSubscription: true,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: "2026-04-17T00:00:00.000Z",
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<PricingPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("scheduled-cancellation-summary")
      ).toBeInTheDocument();
    });
  });

  it("hides Manage Subscription when professional access has no active Stripe subscription", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Pro User", tier: "professional" } },
      status: "authenticated",
    });
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
      if (url.endsWith("/api/stripe/subscription")) {
        return {
          ok: true,
          json: async () => ({
            hasActiveSubscription: false,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.queryByText("Manage Subscription")).not.toBeInTheDocument();
    });
  });

  it("uses the latest quota tier to hide credit purchases for professional users", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Pro User", tier: "free" } },
      status: "authenticated",
    });
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
      if (url.endsWith("/api/stripe/subscription")) {
        return {
          ok: true,
          json: async () => ({
            hasActiveSubscription: true,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<PricingPage />);

    await waitFor(() => {
      const starterCard = screen.getByTestId("plan-starter_pack");
      expect(starterCard).toHaveTextContent("Included in Professional");
    });
    expect(screen.queryByText("Buy Credits")).not.toBeInTheDocument();
  });
});
