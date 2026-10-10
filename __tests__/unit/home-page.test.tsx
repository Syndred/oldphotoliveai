/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockSignIn = jest.fn();
let mockSessionStatus = "authenticated";
let mockTier = "pay_as_you_go";
const mockUseLocale = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: mockSessionStatus === "authenticated" ? { user: { id: "user-test", name: "Test", tier: mockTier } } : null,
    status: mockSessionStatus,
  }),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      upload: {
        title: "Restore Your Old Photos",
        subtitle:
          "AI-powered restoration, colorization, and animation in one click",
        creatingTask: "Creating task...",
        dragDrop: "Drag and drop your photo here",
        browse: "browse files",
        supportedFormats: "Supports JPEG, PNG, WebP (max 10 MB)",
      },
      auth: {
        signInWith: "Sign in with Google",
        signInPrompt: "Sign in to start restoring your photos",
      },
      errors: {
        taskCreateFailed: "Failed to create task",
      },
      nav: {
        home: "Home",
        history: "History",
        pricing: "Pricing",
        login: "Sign In",
        logout: "Sign Out",
      },
      pricing: {
        currentPlan: "Current Plan",
        free: "Free",
        payAsYouGo: "Pay As You Go",
        professional: "Professional",
      },
      quota: {
        remaining: "{count} remaining",
      },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => mockUseLocale(),
}));

jest.mock("@/components/Navbar", () => ({
  __esModule: true,
  default: () => <nav data-testid="navbar" />,
}));

jest.mock("@/app/sections/HeroSection", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => (
    <section data-testid="hero-section">{children}</section>
  ),
}));

jest.mock("@/app/sections/ShowcaseSection", () => ({
  __esModule: true,
  default: () => <section data-testid="showcase-section" />,
}));

jest.mock("@/app/sections/VideoShowcaseSection", () => ({
  __esModule: true,
  default: () => <section data-testid="video-showcase-section" />,
}));

jest.mock("@/app/sections/FeaturesSection", () => ({
  __esModule: true,
  default: () => <section data-testid="features-section" />,
}));

jest.mock("@/components/tool/ToolCardsSection", () => ({
  __esModule: true,
  default: () => <section data-testid="tool-pages-section" />,
}));

jest.mock("@/app/sections/HowItWorksSection", () => ({
  __esModule: true,
  default: () => <section data-testid="how-it-works-section" />,
}));

jest.mock("@/app/sections/FAQSection", () => ({
  __esModule: true,
  default: () => <section data-testid="faq-section" />,
}));

jest.mock("@/app/sections/FooterSection", () => ({
  __esModule: true,
  default: () => <footer data-testid="footer-section" />,
}));

jest.mock("@/components/UploadZone", () => {
  return function MockUploadZone({
    onUpload,
    disabled,
  }: {
    onUpload: (url: string) => void;
    disabled?: boolean;
  }) {
    return (
      <div data-testid="upload-zone" data-disabled={disabled}>
        <button
          data-testid="trigger-upload"
          onClick={() => onUpload("uploads/test-photo/original.jpg")}
          disabled={disabled}
        >
          Upload
        </button>
      </div>
    );
  };
});

import HomePage from "@/app/page";
import HomePageView from "@/components/HomePageView";
import {
  __resetI18nNavigationMocks,
  __setMockLocale,
  __setMockPathname,
  mockRouterPush,
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

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  mockTier = "pay_as_you_go";
  __resetI18nNavigationMocks();
  __setMockLocale("en");
  __setMockPathname("/");
  mockUseLocale.mockReturnValue("en");
  mockSessionStatus = "authenticated";
  global.fetch = jest.fn(async (input: unknown) => {
    const url = getRequestUrl(input);
    if (url.endsWith("/api/quota")) return { ok: true, json: async () => ({ tier: mockTier }) };
    if (url.endsWith("/api/photo-orders")) return { ok: true, json: async () => ({ orderId: "order-123", taskId: "reserved-task", status: "unpaid" }) };
    if (url.endsWith("/api/tasks")) {
      return { ok: true, json: async () => ({ taskId: "task-123" }) };
    }
    return { ok: true, json: async () => ({}) };
  }) as jest.Mock;
});

describe("HomePage", () => {
  it.each([
    ["en", "This upload: Photo colorization"],
    ["zh", "本次处理: 修复、上色并生成动画"],
  ] as const)("discloses the %s upload workflow before the photo is selected", (locale, label) => {
    mockUseLocale.mockReturnValue(locale);
    __setMockLocale(locale);
    render(<HomePageView locale={locale} />);
    const hero = screen.getByTestId("hero-section");
    expect(hero).toContainElement(screen.getByText(label));
    expect(screen.getByText(label).compareDocumentPosition(screen.getByTestId("upload-zone")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(["zh", "es", "ja"] as const)("preserves the full workflow on the %s homepage", async (locale) => {
    mockUseLocale.mockReturnValue(locale);
    __setMockLocale(locale);
    render(<HomePageView locale={locale} />);
    fireEvent.click(screen.getByTestId("trigger-upload"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({
        body: JSON.stringify({ imageKey: "uploads/test-photo/original.jpg", workflow: "full" }),
      }));
    });
  });
  it("renders the upload zone inside the hero section", () => {
    render(<HomePage />);
    const hero = screen.getByTestId("hero-section");
    expect(hero).toContainElement(screen.getByTestId("upload-zone"));
  });

  it("renders the upload zone", () => {
    render(<HomePage />);
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });

  it("renders SEO tool navigation and related tool links", () => {
    render(<HomePage />);

    expect(screen.getByRole("navigation", {
      name: "OldPhotoLiveAI tool navigation",
    })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Photo Pricing & Credit Packs" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "AI Photo Colorizer" })).toHaveAttribute("href", "/colorize-old-photos");
    expect(
      screen.getAllByRole("link", { name: "Restore old photos" })[0]
    ).toHaveAttribute("href", "/restore-old-photos");
    expect(
      screen.getAllByRole("link", { name: "Animate old photos" })[0]
    ).toHaveAttribute("href", "/animate");
    expect(
      screen.queryByRole("link", { name: "Repair damaged photos" })
    ).not.toBeInTheDocument();
  });

  it("shows the content safety notice and localized terms link", () => {
    render(<HomePage />);

    expect(screen.getByText("Content Safety")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Only upload lawful images you have the right to use. NSFW, nude, sexually explicit, pornographic, or exploitative content is prohibited and may be blocked or removed. Credits used on rejected content are non-refundable."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Read our Terms of Service" })
    ).toHaveAttribute("href", "/terms");
  });

  it("creates a task and navigates to the localized result page", async () => {
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageKey: "uploads/test-photo/original.jpg",
          workflow: "colorize",
        }),
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/result/task-123");
    });
  });

  it("shows a loading state while creating a task", async () => {
    let resolveTask!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockImplementation((input: unknown) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/api/quota")) return Promise.resolve({ ok: true, json: async () => ({ tier: mockTier }) });
      if (url.endsWith("/api/tasks")) {
        return new Promise((resolve) => {
          resolveTask = resolve;
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(screen.getByText("Creating task...")).toBeInTheDocument();
    });

    expect(screen.getByTestId("upload-zone")).toHaveAttribute(
      "data-disabled",
      "true"
    );

    resolveTask({ ok: true, json: async () => ({ taskId: "t1" }) });
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith("/result/t1")
    );
  });

  it("shows an API error when task creation fails", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: unknown) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/api/quota")) return Promise.resolve({ ok: true, json: async () => ({ tier: mockTier }) });
      if (url.endsWith("/api/tasks")) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: "Quota exceeded" }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Quota exceeded");
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("shows a thrown error when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockImplementation((input: unknown) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/api/quota")) return Promise.resolve({ ok: true, json: async () => ({ tier: mockTier }) });
      if (url.endsWith("/api/tasks")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });

  it("redirects unauthenticated users to sign in with a localized callback URL", () => {
    mockSessionStatus = "unauthenticated";
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/?resumeUpload=1#upload-section",
    });
    expect(global.fetch).not.toHaveBeenCalled();
    const saved = JSON.parse(sessionStorage.getItem("opla:pending-upload:v1") || "null");
    expect(saved).toMatchObject({ imageKey: "uploads/test-photo/original.jpg", workflow: "colorize", pathname: "/", userId: "" });
    expect(mockSignIn.mock.calls[0][1].callbackUrl).not.toContain("original.jpg");
  });

  it("lets guests upload before login and discloses payment before processing", () => {
    mockSessionStatus = "unauthenticated";
    render(<HomePage />);

    expect(screen.getByText(/Upload your photo, sign in, then pay \$1.99/)).toBeInTheDocument();
    expect(screen.getByTestId("trigger-upload")).toBeEnabled();
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

it.each(["en", "zh"] as const)("creates an unpaid order for a %s homepage without a paid allowance", async locale => {
  mockTier = "free";
  mockUseLocale.mockReturnValue(locale);
  __setMockLocale(locale);
  render(<HomePageView locale={locale} />);
  fireEvent.click(screen.getByTestId("trigger-upload"));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/photo-orders", expect.objectContaining({ body: JSON.stringify({ imageKey: "uploads/test-photo/original.jpg", workflow: locale === "en" ? "colorize" : "full", locale }) })));
  expect(mockRouterPush).toHaveBeenCalledWith(`${locale === "en" ? "" : `/${locale}`}/pricing?orderId=order-123&plan=single_run`);
  expect((global.fetch as jest.Mock).mock.calls.some(([url]) => url === "/api/tasks")).toBe(false);
});
