"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthButton from "./AuthButton";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV_LINKS = [
  { href: "/", labelKey: "home" },
  { href: "/history", labelKey: "history" },
  { href: "/pricing", labelKey: "pricing" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-primary-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-lg font-bold text-transparent"
        >
          OldPhotoLive AI
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map(({ href, labelKey }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-2 py-2 text-sm transition-colors min-h-[44px] flex items-center sm:px-3 ${
                  isActive
                    ? "text-white"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </div>

        {/* Auth, Language & Mobile Menu Button */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <AuthButton />
          {/* Hamburger button - visible only on small screens */}
          <button
            type="button"
            className="sm:hidden flex items-center justify-center rounded-md p-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 px-4 pb-3 pt-2">
          {NAV_LINKS.map(({ href, labelKey }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "text-white"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
