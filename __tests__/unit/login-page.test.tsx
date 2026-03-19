/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-auth/react
const mockSignIn = jest.fn();
jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signOut: jest.fn(),
}));

const mockSearchParamsGet = jest.fn();
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsGet(key),
  }),
}));

// Mock next-intl
const mockUseLocale = jest.fn();
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      auth: { signInWith: "Sign in with Google", signInPrompt: "Sign in to start restoring your photos" },
      nav: { home: "Home", history: "History", pricing: "Pricing", login: "Login", logout: "Logout" },
      common: { loading: "Loading..." },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => mockUseLocale(),
}));

jest.mock("@/components/Navbar", () => ({
  __esModule: true,
  default: () => <nav data-testid="navbar" />,
}));

import LoginPage from "@/app/login/page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocale.mockReturnValue("en");
  mockSearchParamsGet.mockReturnValue(null);
});

describe("LoginPage", () => {
  it("renders the app title", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { level: 1, name: "OldPhotoLive AI" })).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<LoginPage />);
    expect(
      screen.getByText("Sign in to start restoring your photos")
    ).toBeInTheDocument();
  });

  it("renders the Google sign-in button", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();
  });

  it("calls signIn with google provider when button is clicked", () => {
    render(<LoginPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /sign in with google/i })
    );
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/en" });
  });

  it("uses callbackUrl from query string when provided", () => {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "callbackUrl" ? "/zh/pricing" : null
    );

    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/zh/pricing",
    });
  });

  it("uses semantic HTML with main and section elements", () => {
    const { container } = render(<LoginPage />);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("flex", "min-h-screen", "items-center", "justify-center");
    const section = main?.querySelector("section");
    expect(section).toBeInTheDocument();
  });

  it("renders the Navbar", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });
});
