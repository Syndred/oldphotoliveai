/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockSignIn = jest.fn();
let mockSessionStatus = "authenticated";
const mockUseLocale = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Test" } },
    status: mockSessionStatus,
  }),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      history: {
        title: "Processing History",
        empty: "No processing history yet",
        deleteSelected: "Delete Selected",
        deleting: "Deleting...",
        selectAll: "Select All",
        deselectAll: "Deselect All",
        delete: "Delete",
        "status.pending": "Pending",
        "status.queued": "Queued",
        "status.restoring": "Restoring",
        "status.colorizing": "Colorizing",
        "status.animating": "Animating",
        "status.completed": "Completed",
        "status.failed": "Failed",
        "status.cancelled": "Cancelled",
      },
      errors: { historyLoadFailed: "Failed to load history" },
      auth: {
        signInWith: "Sign in with Google",
        signInPrompt: "Sign in to start restoring your photos",
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

import HistoryPage from "@/app/history/page";
import {
  __resetI18nNavigationMocks,
  __setMockLocale,
  __setMockPathname,
} from "../helpers/i18n-navigation";

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

function mockFetchForHistory(
  historyHandler: () => Promise<unknown> | unknown
): void {
  (global.fetch as jest.Mock).mockImplementation(
    (input: RequestInfo | URL): Promise<unknown> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/history") {
        return Promise.resolve(historyHandler());
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({}),
      });
    }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetI18nNavigationMocks();
  __setMockLocale("en");
  __setMockPathname("/history");
  mockUseLocale.mockReturnValue("en");
  mockSessionStatus = "authenticated";
  global.fetch = jest.fn();
  sessionStorage.clear();
});

describe("HistoryPage", () => {
  it("shows loading skeleton initially", () => {
    mockFetchForHistory(() => new Promise(() => {}));
    render(<HistoryPage />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders the page title", () => {
    mockFetchForHistory(() => new Promise(() => {}));
    render(<HistoryPage />);
    expect(screen.getByText("Processing History")).toBeInTheDocument();
  });

  it("renders the navbar", () => {
    mockFetchForHistory(() => new Promise(() => {}));
    render(<HistoryPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("fetches and displays tasks", async () => {
    mockFetchForHistory(() => ({
      ok: true,
      json: async () => ({ tasks: MOCK_TASKS }),
    }));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows empty state when no tasks are returned", async () => {
    mockFetchForHistory(() => ({
      ok: true,
      json: async () => ({ tasks: [] }),
    }));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("No processing history yet")).toBeInTheDocument();
    });
  });

  it("shows an API error message when loading fails", async () => {
    mockFetchForHistory(() => ({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    }));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unauthorized");
    });
  });

  it("shows a thrown error message when fetch rejects", async () => {
    mockFetchForHistory(() => Promise.reject(new Error("Network error")));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("calls the history API", async () => {
    mockFetchForHistory(() => ({
      ok: true,
      json: async () => ({ tasks: [] }),
    }));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/history");
    });
  });

  it("falls back to an empty state when tasks are missing", async () => {
    mockFetchForHistory(() => ({
      ok: true,
      json: async () => ({}),
    }));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("No processing history yet")).toBeInTheDocument();
    });
  });

  it("shows the sign-in prompt when unauthenticated", () => {
    mockSessionStatus = "unauthenticated";
    render(<HistoryPage />);

    expect(
      screen.getByText("Sign in to start restoring your photos")
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("uses the localized history URL when prompting sign-in", () => {
    mockSessionStatus = "unauthenticated";
    render(<HistoryPage />);

    screen.getByText("Sign in with Google").click();

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/en/history",
    });
  });
});
