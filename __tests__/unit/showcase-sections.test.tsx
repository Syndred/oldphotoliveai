/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string) => {
      const translations: Record<string, Record<string, string>> = {
        "landing.showcase": {
          title: "Real Results by Scenario",
          "categories.restoration.title": "AI Restoration",
          "categories.restoration.subtitle": "Restore old photos",
          "categories.colorization.title": "AI Colorization",
          "categories.colorization.subtitle": "Add natural colors",
          "controls.previous": "Previous",
          "controls.next": "Next",
        },
        "landing.videoShowcase": {
          title: "Photo Animation Cases",
          subtitle: "Browse hand-picked animation examples.",
          "controls.previous": "Previous",
          "controls.next": "Next",
        },
      };

      return translations[namespace]?.[key] ?? key;
    },
}));

jest.mock("@/components/BeforeAfterCompare", () => ({
  __esModule: true,
  default: ({
    beforeUrl,
    afterUrl,
  }: {
    beforeUrl: string;
    afterUrl: string;
  }) => (
    <div
      data-testid="before-after-card"
      data-before-url={beforeUrl}
      data-after-url={afterUrl}
    />
  ),
}));

jest.mock("@/components/VideoPlayer", () => ({
  __esModule: true,
  default: ({ src }: { src: string }) => (
    <div data-testid="video-player-mock" data-src={src} />
  ),
}));

import ShowcaseSection from "@/app/sections/ShowcaseSection";
import VideoShowcaseSection from "@/app/sections/VideoShowcaseSection";

describe("ShowcaseSection", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_R2_DOMAIN = "cdn.example.com";
  });

  it("shows navigation buttons and rotates restoration items manually", () => {
    render(<ShowcaseSection />);

    expect(screen.getAllByTestId("before-after-card")).toHaveLength(10);
    expect(screen.getAllByRole("button", { name: "Previous" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Next" }).length).toBeGreaterThan(0);

    const getBeforeUrls = () =>
      screen
        .getAllByTestId("before-after-card")
        .slice(0, 5)
        .map((node) => node.getAttribute("data-before-url"));

    expect(getBeforeUrls()).toEqual([
      "https://cdn.example.com/example/01-before.jpg",
      "https://cdn.example.com/example/02-before.webp",
      "https://cdn.example.com/example/03-before.webp",
      "https://cdn.example.com/example/04-before.jpg",
      "https://cdn.example.com/example/05-before.jfif",
    ]);

    fireEvent.click(screen.getAllByRole("button", { name: "Next" })[0]);

    expect(getBeforeUrls()).toEqual([
      "https://cdn.example.com/example/02-before.webp",
      "https://cdn.example.com/example/03-before.webp",
      "https://cdn.example.com/example/04-before.jpg",
      "https://cdn.example.com/example/05-before.jfif",
      "https://cdn.example.com/example/01-before.jpg",
    ]);
  });
});

describe("VideoShowcaseSection", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_R2_DOMAIN = "cdn.example.com";
  });

  it("shows navigation controls without the extra control bar", () => {
    render(<VideoShowcaseSection />);

    expect(screen.getAllByRole("button", { name: "Previous" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Next" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("1 / 5")).not.toBeInTheDocument();
  });

  it("switches the visible video set when next is clicked", () => {
    render(<VideoShowcaseSection />);

    const getSources = () =>
      screen
        .getAllByTestId("video-player-mock")
        .map((node) => node.getAttribute("data-src"));

    expect(getSources()).toEqual([
      "https://cdn.example.com/example/01-animation.mp4",
      "https://cdn.example.com/example/02-animation.mp4",
      "https://cdn.example.com/example/03-animation.mp4",
    ]);

    fireEvent.click(screen.getAllByRole("button", { name: "Next" })[0]);

    expect(getSources()).toEqual([
      "https://cdn.example.com/example/02-animation.mp4",
      "https://cdn.example.com/example/03-animation.mp4",
      "https://cdn.example.com/example/04-animation.mp4",
    ]);
  });
});
