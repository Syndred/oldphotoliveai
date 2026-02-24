/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockTaskId = "task-abc-123";

jest.mock("next/navigation", () => ({
  useParams: () => ({ taskId: mockTaskId }),
  usePathname: () => `/result/${mockTaskId}`,
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      result: { beforeAfter: "Before & After", animation: "Animation", before: "Before", after: "After", downloadImage: "Download Image", downloadVideo: "Download Video", failed: "Processing Failed", retryMessage: "Something went wrong. Please try again.", retrying: "Retrying…" },
      processing: { title: "Processing Your Photo" },
      common: { retry: "Retry" },
      nav: { home: "Home", history: "History", pricing: "Pricing", login: "Sign In", logout: "Sign Out" },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => "en",
}));

// Capture ProgressIndicator callbacks
let capturedOnComplete: ((data: Record<string, unknown>) => void) | undefined;
let capturedOnError: ((msg: string) => void) | undefined;

jest.mock("@/components/ProgressIndicator", () => {
  return function MockProgressIndicator({
    taskId,
    onComplete,
    onError,
  }: {
    taskId: string;
    onComplete?: (data: Record<string, unknown>) => void;
    onError?: (msg: string) => void;
  }) {
    capturedOnComplete = onComplete;
    capturedOnError = onError;
    return <div data-testid="progress-indicator" data-task-id={taskId} />;
  };
});

jest.mock("@/components/BeforeAfterCompare", () => {
  return function MockBeforeAfterCompare({
    beforeUrl,
    afterUrl,
  }: {
    beforeUrl: string;
    afterUrl: string;
  }) {
    return (
      <div
        data-testid="before-after-compare"
        data-before={beforeUrl}
        data-after={afterUrl}
      />
    );
  };
});

jest.mock("@/components/VideoPlayer", () => {
  return function MockVideoPlayer({ src }: { src: string }) {
    return <div data-testid="video-player" data-src={src} />;
  };
});

jest.mock("@/components/Navbar", () => {
  return function MockNavbar() {
    return <nav data-testid="navbar" />;
  };
});

import ResultPage, { buildCdnUrl } from "@/app/result/[taskId]/page";

// ── Setup ───────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnComplete = undefined;
  capturedOnError = undefined;
  global.fetch = jest.fn();
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_R2_DOMAIN: "cdn.example.com" };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// ── Helper ──────────────────────────────────────────────────────────────────

const COMPLETED_DATA = {
  status: "completed",
  progress: 100,
  originalImageKey: "uploads/original.jpg",
  colorizedImageKey: "results/colorized.jpg",
  animationVideoKey: "results/animation.mp4",
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("buildCdnUrl", () => {
  it("constructs URL from R2 domain and key", () => {
    expect(buildCdnUrl("uploads/test.jpg")).toBe(
      "https://cdn.example.com/uploads/test.jpg"
    );
  });

  it("handles missing domain gracefully", () => {
    delete process.env.NEXT_PUBLIC_R2_DOMAIN;
    expect(buildCdnUrl("key.jpg")).toBe("https:///key.jpg");
  });
});

describe("ResultPage", () => {
  it("renders Navbar", () => {
    render(<ResultPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("shows ProgressIndicator while processing", () => {
    render(<ResultPage />);
    expect(screen.getByTestId("progress-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("progress-indicator")).toHaveAttribute(
      "data-task-id",
      mockTaskId
    );
  });

  it("shows results when task completes", () => {
    render(<ResultPage />);

    act(() => {
      capturedOnComplete?.(COMPLETED_DATA);
    });

    expect(screen.queryByTestId("progress-indicator")).not.toBeInTheDocument();
    expect(screen.getByTestId("before-after-compare")).toBeInTheDocument();
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
  });

  it("passes correct CDN URLs to BeforeAfterCompare", () => {
    render(<ResultPage />);

    act(() => {
      capturedOnComplete?.(COMPLETED_DATA);
    });

    const compare = screen.getByTestId("before-after-compare");
    expect(compare).toHaveAttribute(
      "data-before",
      "https://cdn.example.com/uploads/original.jpg"
    );
    expect(compare).toHaveAttribute(
      "data-after",
      "https://cdn.example.com/results/colorized.jpg"
    );
  });

  it("passes correct CDN URL to VideoPlayer", () => {
    render(<ResultPage />);

    act(() => {
      capturedOnComplete?.(COMPLETED_DATA);
    });

    expect(screen.getByTestId("video-player")).toHaveAttribute(
      "data-src",
      "https://cdn.example.com/results/animation.mp4"
    );
  });

  it("renders download buttons with correct hrefs", () => {
    render(<ResultPage />);

    act(() => {
      capturedOnComplete?.(COMPLETED_DATA);
    });

    const imageLink = screen.getByText("Download Image").closest("a");
    const videoLink = screen.getByText("Download Video").closest("a");

    expect(imageLink).toHaveAttribute(
      "href",
      "https://cdn.example.com/results/colorized.jpg"
    );
    expect(imageLink).toHaveAttribute("download");

    expect(videoLink).toHaveAttribute(
      "href",
      "https://cdn.example.com/results/animation.mp4"
    );
    expect(videoLink).toHaveAttribute("download");
  });

  it("shows error section when task fails", () => {
    render(<ResultPage />);

    act(() => {
      capturedOnError?.("Model execution timed out");
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Processing Failed")).toBeInTheDocument();
    expect(screen.getByText("Model execution timed out")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("hides progress when error occurs", () => {
    render(<ResultPage />);

    act(() => {
      capturedOnError?.("Something broke");
    });

    expect(screen.queryByTestId("progress-indicator")).not.toBeInTheDocument();
  });

  it("calls retry API on retry click", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Task queued for retry" }),
    });

    render(<ResultPage />);

    act(() => {
      capturedOnError?.("Processing failed");
    });

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/tasks/${mockTaskId}/retry`,
        { method: "POST" }
      );
    });
  });

  it("shows error when retry API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Only failed tasks can be retried" }),
    });

    render(<ResultPage />);

    act(() => {
      capturedOnError?.("Original error");
    });

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(
        screen.getByText("Only failed tasks can be retried")
      ).toBeInTheDocument();
    });
  });

  it("disables retry button while retrying", async () => {
    let resolveRetry!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = resolve;
      })
    );

    render(<ResultPage />);

    act(() => {
      capturedOnError?.("Failed");
    });

    const retryBtn = screen.getByText("Retry");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Retrying…")).toBeInTheDocument();
    });

    // Resolve to clean up — reload will throw in jsdom but that's fine
    resolveRetry({ ok: false, json: async () => ({ error: "err" }) });
    await waitFor(() => expect(screen.getByText("Retry")).toBeInTheDocument());
  });
});
