/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock validation module
jest.mock("@/lib/validation", () => ({
  SUPPORTED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
}));

import UploadZone from "@/components/UploadZone";

// Helper to create a mock File
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

// Helper to mock XMLHttpRequest
function mockXHR(options: {
  status?: number;
  response?: string;
  progressEvents?: { loaded: number; total: number }[];
  error?: boolean;
}) {
  const {
    status = 200,
    response = '{"url":"https://cdn.example.com/test.jpg"}',
    progressEvents = [],
    error = false,
  } = options;

  const listeners: Record<string, EventListener[]> = {};
  const uploadListeners: Record<string, EventListener[]> = {};

  const mockInstance = {
    open: jest.fn(),
    send: jest.fn().mockImplementation(() => {
      // Fire progress events
      for (const pe of progressEvents) {
        for (const fn of uploadListeners["progress"] || []) {
          (fn as (e: Partial<ProgressEvent>) => void)({
            lengthComputable: true,
            loaded: pe.loaded,
            total: pe.total,
          });
        }
      }

      if (error) {
        for (const fn of listeners["error"] || []) {
          (fn as () => void)();
        }
      } else {
        Object.defineProperty(mockInstance, "status", { value: status, writable: true });
        Object.defineProperty(mockInstance, "responseText", { value: response, writable: true });
        for (const fn of listeners["load"] || []) {
          (fn as () => void)();
        }
      }
    }),
    addEventListener: jest.fn((event: string, fn: EventListener) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    }),
    upload: {
      addEventListener: jest.fn((event: string, fn: EventListener) => {
        uploadListeners[event] = uploadListeners[event] || [];
        uploadListeners[event].push(fn);
      }),
    },
    status: 0,
    responseText: "",
  };

  jest
    .spyOn(window, "XMLHttpRequest")
    .mockImplementation(() => mockInstance as unknown as XMLHttpRequest);

  return mockInstance;
}

describe("UploadZone", () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ── Rendering ───────────────────────────────────────────────────────────

  it("renders the drop zone with instructions", () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    expect(screen.getByText("Drag and drop your photo here")).toBeInTheDocument();
    expect(screen.getByText("browse files")).toBeInTheDocument();
    expect(screen.getByText(/Supports JPEG, PNG, WebP/)).toBeInTheDocument();
  });

  it("renders with accessible role and label", () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });
    expect(zone).toBeInTheDocument();
    expect(zone).toHaveAttribute("tabindex", "0");
  });

  it("applies disabled styling when disabled", () => {
    render(<UploadZone onUpload={mockOnUpload} disabled />);
    const zone = screen.getByRole("button", { name: /upload photo/i });
    expect(zone.className).toContain("opacity-50");
    expect(zone.className).toContain("pointer-events-none");
  });

  // ── Client-side validation ──────────────────────────────────────────────

  it("shows error for unsupported file type", async () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    const file = createMockFile("test.gif", 1024, "image/gif");
    const dataTransfer = { files: [file] } as unknown as DataTransfer;

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please upload a JPEG, PNG, or WebP image"
      );
    });
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it("shows error for file exceeding 10MB", async () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    const file = createMockFile("big.jpg", 11 * 1024 * 1024, "image/jpeg");
    const dataTransfer = { files: [file] } as unknown as DataTransfer;

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/exceeds the 10MB limit/);
    });
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  // ── Drag & drop ─────────────────────────────────────────────────────────

  it("applies dragging style on dragOver", () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    fireEvent.dragOver(zone);
    expect(zone.className).toContain("scale-[1.02]");
  });

  it("removes dragging style on dragLeave", () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    fireEvent.dragOver(zone);
    expect(zone.className).toContain("scale-[1.02]");

    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain("scale-[1.02]");
  });

  // ── Upload flow ─────────────────────────────────────────────────────────

  it("uploads valid file and calls onUpload with URL", async () => {
    const xhrMock = mockXHR({
      status: 200,
      response: '{"url":"https://cdn.example.com/photo.jpg"}',
    });

    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    const file = createMockFile("photo.jpg", 5000, "image/jpeg");
    const dataTransfer = { files: [file] } as unknown as DataTransfer;

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith("https://cdn.example.com/photo.jpg");
    });

    expect(xhrMock.open).toHaveBeenCalledWith("POST", "/api/upload");
    expect(xhrMock.send).toHaveBeenCalled();
  });

  it("shows upload progress", async () => {
    mockXHR({
      status: 200,
      response: '{"url":"https://cdn.example.com/photo.jpg"}',
      progressEvents: [
        { loaded: 50, total: 100 },
        { loaded: 100, total: 100 },
      ],
    });

    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    const file = createMockFile("photo.png", 5000, "image/png");
    const dataTransfer = { files: [file] } as unknown as DataTransfer;

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it("shows error on server error response", async () => {
    mockXHR({
      status: 400,
      response: '{"error":"File type not supported"}',
    });

    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    const file = createMockFile("photo.jpg", 5000, "image/jpeg");
    const dataTransfer = { files: [file] } as unknown as DataTransfer;

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("File type not supported");
    });
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it("shows error on network failure", async () => {
    mockXHR({ error: true });

    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });

    const file = createMockFile("photo.webp", 5000, "image/webp");
    const dataTransfer = { files: [file] } as unknown as DataTransfer;

    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Network error/);
    });
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  // ── Click to browse ─────────────────────────────────────────────────────

  it("opens file picker on click", () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, "click");

    fireEvent.click(zone);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("opens file picker on Enter key", () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const zone = screen.getByRole("button", { name: /upload photo/i });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, "click");

    fireEvent.keyDown(zone, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("has correct accept attribute on file input", () => {
    render(<UploadZone onUpload={mockOnUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe("image/jpeg,image/png,image/webp");
  });
});
