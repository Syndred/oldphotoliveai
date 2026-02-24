/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mock next/image ─────────────────────────────────────────────────────────

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      result: { before: "Before", after: "After" },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => "en",
}));

jest.mock("next/image", () => {
  const MockImage = (props: Record<string, unknown>) => {
    const { fill, priority, onLoad, ...rest } = props;
    return (
      <img
        {...rest}
        data-fill={fill ? "true" : undefined}
        data-priority={priority ? "true" : undefined}
        onLoad={onLoad as React.ReactEventHandler<HTMLImageElement>}
      />
    );
  };
  MockImage.displayName = "MockImage";
  return { __esModule: true, default: MockImage };
});

import BeforeAfterCompare, {
  clamp,
  calcPosition,
} from "@/components/BeforeAfterCompare";

// ── Helper ──────────────────────────────────────────────────────────────────

function getSlider() {
  return screen.getByRole("slider");
}

// ── Pure function tests ─────────────────────────────────────────────────────

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to min", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("clamps to max", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("handles equal min and max", () => {
    expect(clamp(50, 25, 25)).toBe(25);
  });
});

describe("calcPosition", () => {
  const rect = { left: 100, width: 200 } as DOMRect;

  it("returns 0 at left edge", () => {
    expect(calcPosition(100, rect)).toBe(0);
  });

  it("returns 50 at center", () => {
    expect(calcPosition(200, rect)).toBe(50);
  });

  it("returns 100 at right edge", () => {
    expect(calcPosition(300, rect)).toBe(100);
  });

  it("clamps below left edge", () => {
    expect(calcPosition(50, rect)).toBe(0);
  });

  it("clamps beyond right edge", () => {
    expect(calcPosition(400, rect)).toBe(100);
  });
});

// ── Component tests ─────────────────────────────────────────────────────────

describe("BeforeAfterCompare", () => {
  const defaultProps = {
    beforeUrl: "https://cdn.example.com/before.jpg",
    afterUrl: "https://cdn.example.com/after.jpg",
  };

  it("renders with data-testid", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    expect(screen.getByTestId("before-after-compare")).toBeInTheDocument();
  });

  it("renders both images with correct src", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", defaultProps.afterUrl);
    expect(images[1]).toHaveAttribute("src", defaultProps.beforeUrl);
  });

  it("uses default labels 'Before' and 'After'", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("uses custom labels when provided", () => {
    render(
      <BeforeAfterCompare
        {...defaultProps}
        beforeLabel="Original"
        afterLabel="Restored"
      />,
    );
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Restored")).toBeInTheDocument();
  });

  it("renders slider with correct ARIA attributes", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    const slider = getSlider();
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
    expect(slider).toHaveAttribute("aria-label", "Before and after comparison slider");
  });

  it("responds to ArrowLeft key by decreasing position", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    const slider = getSlider();

    fireEvent.keyDown(slider, { key: "ArrowLeft" });

    expect(slider).toHaveAttribute("aria-valuenow", "48");
  });

  it("responds to ArrowRight key by increasing position", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    const slider = getSlider();

    fireEvent.keyDown(slider, { key: "ArrowRight" });

    expect(slider).toHaveAttribute("aria-valuenow", "52");
  });

  it("does not change position for non-arrow keys", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    const slider = getSlider();

    fireEvent.keyDown(slider, { key: "Enter" });

    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("sets alt text from labels", () => {
    render(
      <BeforeAfterCompare
        {...defaultProps}
        beforeLabel="Original"
        afterLabel="Colorized"
      />,
    );
    expect(screen.getByAltText("Original")).toBeInTheDocument();
    expect(screen.getByAltText("Colorized")).toBeInTheDocument();
  });

  it("is focusable via tabIndex", () => {
    render(<BeforeAfterCompare {...defaultProps} />);
    const slider = getSlider();
    expect(slider).toHaveAttribute("tabindex", "0");
  });
});
