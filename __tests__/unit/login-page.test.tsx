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

// Mock next/navigation (Navbar dependency)
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/login",
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      auth: { signInWith: "Sign in with Google", signInPrompt: "Sign in to start restoring your photos" },
    };
    return translations[namespace]?.[key] ?? key;
  },
  useLocale: () => "en",
}));

import LoginPage from "@/app/login/page";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LoginPage", () => {
  it("renders the app title", () => {
    render(<LoginPage />);
    expect(screen.getByText("OldPhotoLive AI")).toBeInTheDocument();
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
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("has a centered card layout", () => {
    const { container } = render(<LoginPage />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("flex", "min-h-screen", "items-center", "justify-center");
  });
});
