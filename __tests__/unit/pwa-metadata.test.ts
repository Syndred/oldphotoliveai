import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/font/google", () => ({
  Inter: () => ({ variable: "" }),
}));

jest.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getMessages: async () => ({}),
}));

jest.mock("@/components/Analytics", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/Providers", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/RouteProgress", () => ({ __esModule: true, default: () => null }));

import * as rootLayout from "@/app/layout";

describe("root PWA metadata", () => {
  it("declares the web app manifest and a mobile browser theme color", () => {
    const metadata = rootLayout.metadata;
    const viewport = (rootLayout as { viewport?: unknown }).viewport;

    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.appleWebApp).toMatchObject({
      capable: true,
      title: "OldPhotoLive AI",
    });
    expect(viewport).toMatchObject({ themeColor: "#111827" });
  });

  it("puts Organization, WebSite, and WebApplication JSON-LD in the document head", async () => {
    const RootLayout = rootLayout.default;
    const document = renderToStaticMarkup(
      await RootLayout({ children: React.createElement("main", null, "Page content") })
    );

    expect(document).toContain('"@type":"Organization"');
    expect(document).toContain('"@type":"WebSite"');
    expect(document).toContain('"@type":"WebApplication"');
    expect(document.indexOf("<head>")).toBeLessThan(
      document.indexOf('"@type":"Organization"')
    );
  });
});
