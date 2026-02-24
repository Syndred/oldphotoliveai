/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  usePathname: () => "/history",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next-intl (needed by LanguageSwitcher and i18n components)
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      history: {
        title: "Processing History", empty: "No processing history yet",
        "status.pending": "Pending", "status.queued": "Queued",
        "status.restoring": "Restoring", "status.colorizing": "Colorizing",
        "status.animating": "Animating", "status.completed": "Completed",
        "status.failed": "Failed", "status.cancelled": "Cancelled",
      },
      nav: { home: "Home", history: "History", pricing: "Pricing", login: "Sign In", logout: "Sign Out" },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => "en",
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

import HistoryPage from "@/app/history/page";

// ── Setup ───────────────────────────────────────────────────────────────────

const MOCK_TASKS = [
  {
    id: "task-1",
    status: "completed",
    progress: 100,
    createdAt: "2024-01-15T10:30:00Z",
    completedAt: "2024-01-15T10:35:00Z",
    thumbnailUrl: "https://cdn.example.com/thumb1.jpg",
    errorMessage: null,
  },
  {
    id: "task-2",
    status: "failed",
    progress: 50,
    createdAt: "2024-01-14T08:00:00Z",
    completedAt: null,
    thumbnailUrl: null,
    errorMessage: "Timeout",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("HistoryPage", () => {
  it("shows loading skeleton initially", () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<HistoryPage />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders page title", () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<HistoryPage />);
    expect(screen.getByText("Processing History")).toBeInTheDocument();
  });

  it("fetches and displays tasks", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: MOCK_TASKS }),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows empty state when no tasks returned", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] }),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No processing history yet")
      ).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });
  });

  it("shows generic error when fetch throws", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("hides loading skeleton after fetch completes", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: MOCK_TASKS }),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
  });

  it("calls /api/history endpoint", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] }),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/history");
    });
  });

  it("handles response with missing tasks field", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No processing history yet")
      ).toBeInTheDocument();
    });
  });
});
