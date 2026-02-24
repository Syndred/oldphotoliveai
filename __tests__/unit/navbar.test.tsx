/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-auth/react
const mockUseSession = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock next/navigation
const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

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

import AuthButton from "@/components/AuthButton";
import Navbar from "@/components/Navbar";

describe("AuthButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading skeleton when session is loading", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });
    const { container } = render(<AuthButton />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("shows Sign In button when not authenticated", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<AuthButton />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("calls signIn with google when Sign In is clicked", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<AuthButton />);
    screen.getByText("Sign In").click();
    expect(mockSignIn).toHaveBeenCalledWith("google");
  });

  it("shows user info and Sign Out when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.jpg",
        },
      },
      status: "authenticated",
    });
    render(<AuthButton />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
    expect(screen.getByAltText("Test User")).toBeInTheDocument();
  });

  it("calls signOut when Sign Out is clicked", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com", image: null },
      },
      status: "authenticated",
    });
    render(<AuthButton />);
    screen.getByText("Sign Out").click();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("handles user without avatar image", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "No Avatar", email: "test@example.com", image: null },
      },
      status: "authenticated",
    });
    render(<AuthButton />);
    expect(screen.getByText("No Avatar")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  it("renders the logo text", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    expect(screen.getByText("OldPhotoLive AI")).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });

  it("links point to correct routes", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/");
    expect(screen.getByText("History").closest("a")).toHaveAttribute(
      "href",
      "/history"
    );
    expect(screen.getByText("Pricing").closest("a")).toHaveAttribute(
      "href",
      "/pricing"
    );
  });

  it("highlights active Home link when on /", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.className).toContain("text-white");
  });

  it("highlights active History link when on /history", () => {
    mockUsePathname.mockReturnValue("/history");
    render(<Navbar />);
    const historyLink = screen.getByText("History").closest("a");
    // Active link has "text-white" as a standalone class (not just in hover:text-white)
    expect(historyLink?.className).toMatch(/(?<![:\w-])text-white(?!\S)/);
    const homeLink = screen.getByText("Home").closest("a");
    // Home should have the secondary text color, not the active white
    expect(homeLink?.className).toContain("text-[var(--color-text-secondary)]");
  });

  it("includes AuthButton", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    // AuthButton renders Sign In when unauthenticated
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("logo links to home page", () => {
    mockUsePathname.mockReturnValue("/pricing");
    render(<Navbar />);
    const logo = screen.getByText("OldPhotoLive AI").closest("a");
    expect(logo).toHaveAttribute("href", "/");
  });
});
