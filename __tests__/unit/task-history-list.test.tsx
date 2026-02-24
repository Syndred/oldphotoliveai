/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

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

// Mock next-intl
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
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => "en",
}));

import TaskHistoryList from "@/components/TaskHistoryList";
import type { TaskHistoryItem } from "@/components/TaskHistoryList";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<TaskHistoryItem> = {}): TaskHistoryItem {
  return {
    id: "task-1",
    status: "completed",
    progress: 100,
    createdAt: "2024-01-15T10:30:00Z",
    completedAt: "2024-01-15T10:35:00Z",
    thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    errorMessage: null,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("TaskHistoryList", () => {
  it("shows empty state when no tasks", () => {
    render(<TaskHistoryList tasks={[]} />);
    expect(screen.getByText("No processing history yet")).toBeInTheDocument();
  });

  it("renders task cards with thumbnails", () => {
    render(<TaskHistoryList tasks={[makeTask()]} />);
    const img = screen.getByAltText("Task thumbnail");
    expect(img).toHaveAttribute("src", "https://cdn.example.com/thumb.jpg");
  });

  it("shows placeholder when thumbnailUrl is null", () => {
    render(<TaskHistoryList tasks={[makeTask({ thumbnailUrl: null })]} />);
    expect(screen.queryByAltText("Task thumbnail")).not.toBeInTheDocument();
  });

  it("links each task to /result/[taskId]", () => {
    render(
      <TaskHistoryList
        tasks={[makeTask({ id: "abc-123" }), makeTask({ id: "def-456" })]}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/result/abc-123");
    expect(links[1]).toHaveAttribute("href", "/result/def-456");
  });

  it("displays correct status badges", () => {
    const tasks = [
      makeTask({ id: "1", status: "completed" }),
      makeTask({ id: "2", status: "failed" }),
      makeTask({ id: "3", status: "cancelled" }),
      makeTask({ id: "4", status: "restoring" }),
    ];
    render(<TaskHistoryList tasks={tasks} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Restoring")).toBeInTheDocument();
  });

  it("shows progress bar for processing tasks", () => {
    const { container } = render(
      <TaskHistoryList
        tasks={[makeTask({ status: "colorizing", progress: 50 })]}
      />
    );
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("does not show progress bar for completed tasks", () => {
    const { container } = render(
      <TaskHistoryList
        tasks={[makeTask({ status: "completed", progress: 100 })]}
      />
    );
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).not.toBeInTheDocument();
  });

  it("shows error message for failed tasks", () => {
    render(
      <TaskHistoryList
        tasks={[
          makeTask({
            status: "failed",
            errorMessage: "Model execution timed out",
          }),
        ]}
      />
    );
    expect(screen.getByText("Model execution timed out")).toBeInTheDocument();
  });

  it("does not show error message for non-failed tasks", () => {
    render(
      <TaskHistoryList
        tasks={[makeTask({ status: "completed", errorMessage: null })]}
      />
    );
    expect(
      screen.queryByText("Model execution timed out")
    ).not.toBeInTheDocument();
  });

  it("displays formatted date", () => {
    render(
      <TaskHistoryList
        tasks={[makeTask({ createdAt: "2024-01-15T10:30:00Z" })]}
      />
    );
    // The exact format depends on locale, but the date text should be present
    const dateEl = screen
      .getAllByText(/2024|Jan|15/)
      .find((el) => el.tagName === "P");
    expect(dateEl).toBeTruthy();
  });

  it("shows all processing status badges correctly", () => {
    const tasks = [
      makeTask({ id: "1", status: "pending", progress: 0 }),
      makeTask({ id: "2", status: "queued", progress: 5 }),
      makeTask({ id: "3", status: "animating", progress: 75 }),
    ];
    render(<TaskHistoryList tasks={tasks} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("Animating")).toBeInTheDocument();
  });

  it("handles unknown status gracefully", () => {
    render(
      <TaskHistoryList tasks={[makeTask({ status: "unknown_status" })]} />
    );
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });
});
