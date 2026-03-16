/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

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

// Mock next-auth (default to authenticated)
const mockSignIn = jest.fn();
let mockSessionStatus = "authenticated";
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Test" } }, status: mockSessionStatus }),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      nav: {
        home: "Home",
        history: "History",
        pricing: "Pricing",
        login: "Sign In",
        logout: "Sign Out",
      },
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
      pricing: {
        currentPlan: "Current Plan",
        free: "Free",
        payAsYouGo: "Pay As You Go",
        professional: "Professional",
      },
      quota: {
        remaining: "{count} remaining",
        resetsAt: "Resets at {time}",
        unlimited: "Unlimited",
      },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => "en",
}));

// Mock UploadZone to control onUpload callback
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
          onClick={() => onUpload("https://cdn.example.com/test.jpg")}
          disabled={disabled}
        >
          Upload
        </button>
      </div>
    );
  };
});

import HomePage from "@/app/page";

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
  mockSessionStatus = "authenticated";
  global.fetch = jest.fn(async (input: unknown) => {
    const url = getRequestUrl(input);
    if (url.endsWith("/api/tasks")) {
      return { ok: true, json: async () => ({ taskId: "task-123" }) };
    }
    return { ok: true, json: async () => ({}) };
  }) as jest.Mock;
});

describe("HomePage", () => {
  it("renders title and subtitle", () => {
    render(<HomePage />);
    expect(screen.getByText("Restore Your Old Photos")).toBeInTheDocument();
    expect(
      screen.getByText(/AI-powered restoration, colorization, and animation/)
    ).toBeInTheDocument();
  });

  it("renders UploadZone component", () => {
    render(<HomePage />);
    expect(screen.getByTestId("upload-zone")).toBeInTheDocument();
  });

  it("shows the content safety notice and terms link", () => {
    render(<HomePage />);

    expect(screen.getByText("Content Safety")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Only upload lawful images you have the right to use. NSFW, nude, sexually explicit, pornographic, or exploitative content is prohibited and may be blocked or removed."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Read our Terms of Service" })
    ).toHaveAttribute("href", "/terms");
  });

  it("creates task and navigates to result page on successful upload", async () => {
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey: "https://cdn.example.com/test.jpg" }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/result/task-123");
    });
  });

  it("shows loading state while creating task", async () => {
    let resolveTask!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockImplementation((input: unknown) => {
      const url = getRequestUrl(input);
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
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });

  it("shows error when task creation fails", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: unknown) => {
      const url = getRequestUrl(input);
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

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows generic error when fetch throws", async () => {
    (global.fetch as jest.Mock).mockImplementation((input: unknown) => {
      const url = getRequestUrl(input);
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

  it("redirects to login when unauthenticated user tries to upload", () => {
    mockSessionStatus = "unauthenticated";
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    expect(mockSignIn).toHaveBeenCalledWith("google");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows login prompt when not authenticated", () => {
    mockSessionStatus = "unauthenticated";
    render(<HomePage />);
    expect(
      screen.getByText("Sign in to start restoring your photos")
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
  });
});
