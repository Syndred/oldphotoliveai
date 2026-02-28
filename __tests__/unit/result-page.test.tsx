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

import ResultPage from "@/app/result/[taskId]/page";
import { buildCdnUrl } from "@/lib/url";

// ── Setup ───────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = process.env;

const COMPLETED_DATA = {
  status: "completed",
  progress: 100,
  originalImageKey: "uploads/original.jpg",
  colorizedImageKey: "results/colorized.jpg",
  animationVideoKey: "results/animation.mp4",
};

const PROCESSING_DATA = {
  status: "restoring",
  progress: 25,
};

/** Helper: create a fetch mock that handles /api/quota and /api/tasks/.../status */
function mockFetchWith(statusData: Record<string, unknown>) {
  return jest.fn().mockImplementation((url: string) => {
    if (url === "/api/quota") {
      return Promise.resolve({ ok: true, json: async () => ({ tier: "free", remaining: 1 }) });
    }
    if (url === `/api/tasks/${mockTaskId}/status`) {
      return Promise.resolve({ ok: true, json: async () => statusData });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnComplete = undefined;
  capturedOnError = undefined;
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_R2_DOMAIN: "cdn.example.com" };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("buildCdnUrl", () => {
  it("constructs URL from R2 domain and key", () => {
    expect(buildCdnUrl("uploads/test.jpg")).toBe(
      "https://cdn.example.com/uploads/test.jpg"
    );
  });

  it("URL-encodes unsafe filename characters", () => {
    expect(buildCdnUrl("tasks/abc/my image (1).jfif")).toBe(
      "https://cdn.example.com/tasks/abc/my%20image%20(1).jfif"
    );
  });

  it("handles missing domain gracefully", () => {
    delete process.env.NEXT_PUBLIC_R2_DOMAIN;
    expect(buildCdnUrl("key.jpg")).toBe("https:///key.jpg");
  });
});

describe("ResultPage", () => {
  it("renders Navbar", async () => {
    global.fetch = mockFetchWith(PROCESSING_DATA);
    render(<ResultPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("shows ProgressIndicator for processing tasks", async () => {
    global.fetch = mockFetchWith(PROCESSING_DATA);
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByTestId("progress-indicator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("progress-indicator")).toHaveAttribute(
      "data-task-id",
      mockTaskId
    );
  });

  it("shows results directly for completed tasks (no ProgressIndicator)", async () => {
    global.fetch = mockFetchWith(COMPLETED_DATA);
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByTestId("before-after-compare")).toBeInTheDocument();
    });
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
    expect(screen.queryByTestId("progress-indicator")).not.toBeInTheDocument();
  });

  it("passes correct CDN URLs to BeforeAfterCompare", async () => {
    global.fetch = mockFetchWith(COMPLETED_DATA);
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByTestId("before-after-compare")).toBeInTheDocument();
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

  it("passes correct CDN URL to VideoPlayer", async () => {
    global.fetch = mockFetchWith(COMPLETED_DATA);
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByTestId("video-player")).toBeInTheDocument();
    });

    expect(screen.getByTestId("video-player")).toHaveAttribute(
      "data-src",
      "https://cdn.example.com/results/animation.mp4"
    );
  });

  it("renders download buttons with correct hrefs", async () => {
    global.fetch = mockFetchWith(COMPLETED_DATA);
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByText("Download Image")).toBeInTheDocument();
    });

    const imageLink = screen.getByText("Download Image").closest("a");
    const videoLink = screen.getByText("Download Video").closest("a");

    expect(imageLink).toHaveAttribute("href", "https://cdn.example.com/results/colorized.jpg");
    expect(imageLink).toHaveAttribute("download");
    expect(videoLink).toHaveAttribute("href", "https://cdn.example.com/results/animation.mp4");
    expect(videoLink).toHaveAttribute("download");
  });

  it("shows error section when task is failed", async () => {
    global.fetch = mockFetchWith({ status: "failed", progress: 50, errorMessage: "Model execution timed out" });
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText("Processing Failed")).toBeInTheDocument();
    expect(screen.getByText("Model execution timed out")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows error via SSE callback for processing tasks", async () => {
    global.fetch = mockFetchWith(PROCESSING_DATA);
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByTestId("progress-indicator")).toBeInTheDocument();
    });

    act(() => {
      capturedOnError?.("Something broke");
    });

    expect(screen.queryByTestId("progress-indicator")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows results via SSE callback for processing tasks", async () => {
    global.fetch = mockFetchWith(PROCESSING_DATA);
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByTestId("progress-indicator")).toBeInTheDocument();
    });

    act(() => {
      capturedOnComplete?.(COMPLETED_DATA);
    });

    expect(screen.queryByTestId("progress-indicator")).not.toBeInTheDocument();
    expect(screen.getByTestId("before-after-compare")).toBeInTheDocument();
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
  });

  it("calls retry API on retry click", async () => {
    global.fetch = mockFetchWith({ status: "failed", progress: 50, errorMessage: "Processing failed" });
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === `/api/tasks/${mockTaskId}/retry`) {
        return Promise.resolve({ ok: true, json: async () => ({ message: "Task queued for retry" }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
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
    global.fetch = mockFetchWith({ status: "failed", progress: 50, errorMessage: "Original error" });
    render(<ResultPage />);

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === `/api/tasks/${mockTaskId}/retry`) {
        return Promise.resolve({ ok: false, json: async () => ({ error: "Only failed tasks can be retried" }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("Only failed tasks can be retried")).toBeInTheDocument();
    });
  });
});
