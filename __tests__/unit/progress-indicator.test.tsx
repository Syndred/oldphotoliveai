/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── EventSource mock ────────────────────────────────────────────────────────

type ESListener = (event: MessageEvent | Event) => void;

let mockESInstance: {
  onmessage: ESListener | null;
  onerror: ESListener | null;
  close: jest.Mock;
  url: string;
};

class MockEventSource {
  onmessage: ESListener | null = null;
  onerror: ESListener | null = null;
  close = jest.fn();
  url: string;

  constructor(url: string) {
    this.url = url;
    mockESInstance = this;
  }
}

(global as Record<string, unknown>).EventSource = MockEventSource;

import ProgressIndicator, {
  getSteps,
  getProgress,
  STEP_LABELS,
  STATUS_TO_STEP,
  STATUS_PROGRESS,
} from "@/components/ProgressIndicator";

// ── Helper ──────────────────────────────────────────────────────────────────

function sendSSE(data: Record<string, unknown>) {
  act(() => {
    mockESInstance.onmessage?.({
      data: JSON.stringify(data),
    } as MessageEvent);
  });
}

// ── Pure function tests ─────────────────────────────────────────────────────

describe("getSteps", () => {
  it("marks only Upload as active for pending status", () => {
    const steps = getSteps("pending");
    expect(steps[0].status).toBe("active");
    expect(steps[1].status).toBe("pending");
    expect(steps[2].status).toBe("pending");
    expect(steps[3].status).toBe("pending");
  });

  it("marks Upload done and Restore active for restoring", () => {
    const steps = getSteps("restoring");
    expect(steps[0].status).toBe("done");
    expect(steps[1].status).toBe("active");
    expect(steps[2].status).toBe("pending");
    expect(steps[3].status).toBe("pending");
  });

  it("marks Upload+Restore done and Colorize active for colorizing", () => {
    const steps = getSteps("colorizing");
    expect(steps[0].status).toBe("done");
    expect(steps[1].status).toBe("done");
    expect(steps[2].status).toBe("active");
    expect(steps[3].status).toBe("pending");
  });

  it("marks first three done and Animate active for animating", () => {
    const steps = getSteps("animating");
    expect(steps[0].status).toBe("done");
    expect(steps[1].status).toBe("done");
    expect(steps[2].status).toBe("done");
    expect(steps[3].status).toBe("active");
  });

  it("marks all steps done for completed", () => {
    const steps = getSteps("completed");
    steps.forEach((s) => expect(s.status).toBe("done"));
  });

  it("returns correct labels", () => {
    const steps = getSteps("pending");
    expect(steps.map((s) => s.label)).toEqual(["Upload", "Restore", "Colorize", "Animate"]);
  });
});

describe("getProgress", () => {
  it("returns mapped progress for known statuses", () => {
    expect(getProgress("pending")).toBe(0);
    expect(getProgress("queued")).toBe(5);
    expect(getProgress("restoring")).toBe(25);
    expect(getProgress("colorizing")).toBe(50);
    expect(getProgress("animating")).toBe(75);
    expect(getProgress("completed")).toBe(100);
  });

  it("prefers server progress when provided", () => {
    expect(getProgress("restoring", 30)).toBe(30);
  });

  it("returns 0 for unknown status", () => {
    expect(getProgress("unknown_status")).toBe(0);
  });
});

describe("constants", () => {
  it("has 4 step labels", () => {
    expect(STEP_LABELS).toHaveLength(4);
  });

  it("STATUS_TO_STEP maps completed to step 4 (past all steps)", () => {
    expect(STATUS_TO_STEP["completed"]).toBe(4);
  });

  it("STATUS_PROGRESS maps completed to 100", () => {
    expect(STATUS_PROGRESS["completed"]).toBe(100);
  });
});

// ── Component rendering tests ───────────────────────────────────────────────

describe("ProgressIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the stepper with 4 steps", () => {
    render(<ProgressIndicator taskId="task-1" />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Restore")).toBeInTheDocument();
    expect(screen.getByText("Colorize")).toBeInTheDocument();
    expect(screen.getByText("Animate")).toBeInTheDocument();
  });

  it("renders a progress bar", () => {
    render(<ProgressIndicator taskId="task-1" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("connects to SSE endpoint with taskId", () => {
    render(<ProgressIndicator taskId="abc-123" />);
    expect(mockESInstance.url).toBe("/api/tasks/abc-123/stream");
  });

  it("updates steps and progress on SSE restoring event", async () => {
    render(<ProgressIndicator taskId="task-1" />);

    sendSSE({ status: "restoring", progress: 25 });

    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
    });
  });

  it("updates to colorizing state", async () => {
    render(<ProgressIndicator taskId="task-1" />);

    sendSSE({ status: "colorizing", progress: 50 });

    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  it("shows completed state and calls onComplete", async () => {
    const onComplete = jest.fn();
    render(<ProgressIndicator taskId="task-1" onComplete={onComplete} />);

    const completedData = {
      status: "completed",
      progress: 100,
      restoredImageKey: "restored.jpg",
      colorizedImageKey: "colorized.jpg",
      animationVideoKey: "animation.mp4",
    };
    sendSSE(completedData);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(completedData);
      expect(screen.getByText("Processing complete")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    });
    expect(mockESInstance.close).toHaveBeenCalled();
  });

  it("shows error and calls onError on failed status", async () => {
    const onError = jest.fn();
    render(<ProgressIndicator taskId="task-1" onError={onError} />);

    sendSSE({ status: "failed", progress: 25, errorMessage: "Model timeout" });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Model timeout");
      expect(screen.getByText("Model timeout")).toBeInTheDocument();
    });
    expect(mockESInstance.close).toHaveBeenCalled();
  });

  it("handles SSE error event from data payload", async () => {
    const onError = jest.fn();
    render(<ProgressIndicator taskId="task-1" onError={onError} />);

    sendSSE({ error: "Task not found" });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Task not found");
    });
    expect(mockESInstance.close).toHaveBeenCalled();
  });

  it("handles EventSource connection error", async () => {
    const onError = jest.fn();
    render(<ProgressIndicator taskId="task-1" onError={onError} />);

    act(() => {
      mockESInstance.onerror?.(new Event("error"));
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Connection lost");
      expect(screen.getByText("Connection lost")).toBeInTheDocument();
    });
    expect(mockESInstance.close).toHaveBeenCalled();
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = render(<ProgressIndicator taskId="task-1" />);
    const closeFn = mockESInstance.close;
    unmount();
    expect(closeFn).toHaveBeenCalled();
  });

  it("uses default error message when failed without errorMessage", async () => {
    const onError = jest.fn();
    render(<ProgressIndicator taskId="task-1" onError={onError} />);

    sendSSE({ status: "failed", progress: 50 });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Processing failed");
    });
  });

  it("shows waiting text for queued status", async () => {
    render(<ProgressIndicator taskId="task-1" />);

    sendSSE({ status: "queued", progress: 5 });

    await waitFor(() => {
      expect(screen.getByText(/Waiting in queue/)).toBeInTheDocument();
    });
  });

  it("ignores malformed SSE data gracefully", async () => {
    render(<ProgressIndicator taskId="task-1" />);

    // Send invalid JSON - should not throw
    act(() => {
      mockESInstance.onmessage?.({
        data: "not-json",
      } as MessageEvent);
    });

    // Component should still be rendered
    expect(screen.getByTestId("progress-indicator")).toBeInTheDocument();
  });
});
