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

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next-intl (needed by LanguageSwitcher and i18n components)
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      nav: { home: "Home", history: "History", pricing: "Pricing", login: "Sign In", logout: "Sign Out" },
      upload: { title: "Restore Your Old Photos", subtitle: "AI-powered restoration, colorization, and animation in one click", creatingTask: "Creating task…", dragDrop: "Drag and drop your photo here", browse: "browse files", supportedFormats: "Supports JPEG, PNG, WebP (max 10 MB)" },
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

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
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

  it("creates task and navigates to result page on successful upload", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ taskId: "task-123" }),
    });

    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: "https://cdn.example.com/test.jpg" }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/result/task-123");
    });
  });

  it("shows loading state while creating task", async () => {
    let resolveTask!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTask = resolve;
      })
    );

    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(screen.getByText("Creating task…")).toBeInTheDocument();
    });

    // Upload zone should be disabled during task creation
    expect(screen.getByTestId("upload-zone")).toHaveAttribute(
      "data-disabled",
      "true"
    );

    // Resolve to clean up
    resolveTask({ ok: true, json: async () => ({ taskId: "t1" }) });
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });

  it("shows error when task creation fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "Quota exceeded" }),
    });

    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Quota exceeded");
    });

    // Should not navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows generic error when fetch throws", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<HomePage />);
    fireEvent.click(screen.getByTestId("trigger-upload"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });
});
