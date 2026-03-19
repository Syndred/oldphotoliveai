/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        common: {
          videoNotSupported: "Your browser does not support the video tag.",
        },
      };

      return translations[namespace]?.[key] ?? key;
    },
}));

import VideoPlayer from "@/components/VideoPlayer";

describe("VideoPlayer", () => {
  const defaultSrc = "https://cdn.example.com/animation.mp4";

  it("renders with data-testid", () => {
    render(<VideoPlayer src={defaultSrc} />);
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
  });

  it("renders a video element with the correct src", () => {
    render(<VideoPlayer src={defaultSrc} />);
    const video = screen.getByTestId("video-player").querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("src", defaultSrc);
  });

  it("includes native controls", () => {
    render(<VideoPlayer src={defaultSrc} />);
    const video = screen.getByTestId("video-player").querySelector("video");
    expect(video).toHaveAttribute("controls");
  });

  it("sets playsInline for mobile compatibility", () => {
    render(<VideoPlayer src={defaultSrc} />);
    const video = screen.getByTestId("video-player").querySelector("video")!;
    // playsInline is a boolean attribute rendered as playsinline in the DOM
    expect(video.playsInline).toBe(true);
  });

  it("applies poster when provided", () => {
    const poster = "https://cdn.example.com/poster.jpg";
    render(<VideoPlayer src={defaultSrc} poster={poster} />);
    const video = screen.getByTestId("video-player").querySelector("video");
    expect(video).toHaveAttribute("poster", poster);
  });

  it("does not set poster attribute when not provided", () => {
    render(<VideoPlayer src={defaultSrc} />);
    const video = screen.getByTestId("video-player").querySelector("video");
    expect(video).not.toHaveAttribute("poster");
  });

  it("has rounded corners styling class", () => {
    render(<VideoPlayer src={defaultSrc} />);
    const video = screen.getByTestId("video-player").querySelector("video");
    expect(video?.className).toContain("rounded-lg");
  });

  it("contains fallback text for unsupported browsers", () => {
    render(<VideoPlayer src={defaultSrc} />);
    const video = screen.getByTestId("video-player").querySelector("video");
    expect(video?.textContent).toContain(
      "Your browser does not support the video tag."
    );
  });
});
