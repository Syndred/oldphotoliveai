"use client";

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

        {/* Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2">
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

        {/* Auth & Language */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
