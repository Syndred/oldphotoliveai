/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockUseLocale = jest.fn();

jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      history: {
        empty: "No processing history yet",
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
      errors: {
        processingFailedGeneric: "Processing failed",
        taskNotFound: "Task not found",
        sourceImageUnreachable: "Source image is unavailable",
        modelConfigError: "Model config error",
        intermediateDownloadFailed: "Intermediate download failed",
        serviceBusy: "Service is temporarily busy",
        serviceBusyRetry:
          "Service is temporarily busy. Please try again in a moment.",
      },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => mockUseLocale(),
}));

import TaskHistoryList from "@/components/TaskHistoryList";
import type { TaskHistoryItem } from "@/components/TaskHistoryList";
import {
  __resetI18nNavigationMocks,
  __setMockLocale,
} from "../helpers/i18n-navigation";

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

beforeEach(() => {
  __resetI18nNavigationMocks();
  __setMockLocale("en");
  mockUseLocale.mockReturnValue("en");
});

describe("TaskHistoryList", () => {
  it("shows the empty state when there are no tasks", () => {
    render(<TaskHistoryList tasks={[]} />);
    expect(screen.getByText("No processing history yet")).toBeInTheDocument();
  });

  it("renders task cards with thumbnails", () => {
    render(<TaskHistoryList tasks={[makeTask()]} />);
    expect(screen.getByAltText("Task thumbnail")).toHaveAttribute(
      "src",
      "https://cdn.example.com/thumb.jpg"
    );
  });

  it("shows a placeholder when thumbnailUrl is null", () => {
    render(<TaskHistoryList tasks={[makeTask({ thumbnailUrl: null })]} />);
    expect(screen.queryByAltText("Task thumbnail")).not.toBeInTheDocument();
  });

  it("links each task to the localized result page", () => {
    render(
      <TaskHistoryList
        tasks={[makeTask({ id: "abc-123" }), makeTask({ id: "def-456" })]}
      />
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/en/result/abc-123");
    expect(links[1]).toHaveAttribute("href", "/en/result/def-456");
  });

  it("displays translated status badges", () => {
    render(
      <TaskHistoryList
        tasks={[
          makeTask({ id: "1", status: "completed" }),
          makeTask({ id: "2", status: "failed" }),
          makeTask({ id: "3", status: "cancelled" }),
          makeTask({ id: "4", status: "restoring" }),
        ]}
      />
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Restoring")).toBeInTheDocument();
  });

  it("shows a progress bar for processing tasks", () => {
    const { container } = render(
      <TaskHistoryList
        tasks={[makeTask({ status: "colorizing", progress: 50 })]}
      />
    );

    expect(container.querySelector('[style*="width: 50%"]')).toBeInTheDocument();
  });

  it("does not show a progress bar for completed tasks", () => {
    const { container } = render(
      <TaskHistoryList
        tasks={[makeTask({ status: "completed", progress: 100 })]}
      />
    );

    expect(container.querySelector('[style*="width"]')).not.toBeInTheDocument();
  });

  it("shows the resolved error message for failed tasks", () => {
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

  it("formats the created date", () => {
    render(
      <TaskHistoryList
        tasks={[makeTask({ createdAt: "2024-01-15T10:30:00Z" })]}
      />
    );

    const dateText = screen
      .getAllByText(/2024|Jan|15/)
      .find((element) => element.tagName === "P");
    expect(dateText).toBeTruthy();
  });

  it("handles all processing statuses", () => {
    render(
      <TaskHistoryList
        tasks={[
          makeTask({ id: "1", status: "pending", progress: 0 }),
          makeTask({ id: "2", status: "queued", progress: 5 }),
          makeTask({ id: "3", status: "animating", progress: 75 }),
        ]}
      />
    );

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("Animating")).toBeInTheDocument();
  });

  it("falls back to the raw status label for unknown statuses", () => {
    render(
      <TaskHistoryList tasks={[makeTask({ status: "unknown_status" })]} />
    );

    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });
});
