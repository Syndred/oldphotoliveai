"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import AuthButton from "./AuthButton";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import { Link, usePathname } from "@/i18n/navigation";
import type { QuotaInfo, UserTier } from "@/types";

const NAV_LINKS = [
  { href: "/", labelKey: "home" },
  { href: "/pricing", labelKey: "pricing" },
] as const;

function parseUserTier(value: unknown): UserTier | null {
  if (
    value === "free" ||
    value === "pay_as_you_go" ||
    value === "professional"
  ) {
    return value;
  }
  return null;
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const t = useTranslations("nav");
  const tPricing = useTranslations("pricing");
  const tQuota = useTranslations("quota");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const sessionTier = parseUserTier(
    (session?.user as Record<string, unknown> | undefined)?.tier
  );

  useEffect(() => {
    if (status !== "authenticated") {
      setQuota(null);
      return;
    }

    const abortController = new AbortController();

    fetch("/api/quota", { signal: abortController.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as QuotaInfo;
        setQuota(data);
      })
      .catch(() => {
        // Ignore quota fetch error; fallback to session tier label.
      });

    return () => {
      abortController.abort();
    };
  }, [status]);

  const tier = quota?.tier ?? sessionTier;

  const tierBaseLabel =
    tier === "pay_as_you_go"
      ? tPricing("payAsYouGo")
      : tier
        ? tPricing(tier)
        : null;
  const paygRemaining =
    tier === "pay_as_you_go" && quota
      ? quota.credits ?? quota.remaining
      : null;
  const tierLabel =
    tierBaseLabel && paygRemaining !== null
      ? `${tierBaseLabel} | ${tQuota("remaining", { count: paygRemaining })}`
      : tierBaseLabel;
  const navLinks =
    status === "authenticated"
      ? [...NAV_LINKS, { href: "/history", labelKey: "history" as const }]
      : NAV_LINKS;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-primary-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="block min-w-0 max-w-[58vw] sm:max-w-none"
        >
          <BrandLogo
            textClassName="text-base sm:text-lg"
            className="max-w-full"
            iconClassName="h-9 w-9 sm:h-10 sm:w-10"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-2 text-sm transition-colors min-h-[44px] flex items-center sm:px-3 ${
                  isActive
                    ? "text-white"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </div>

        {/* Auth, Language & Mobile Menu Button */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <AuthButton tierBadgeText={tierLabel} />
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
        <div className="sm:hidden border-t border-white/10 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
          {tierLabel && (
            <div className="px-3 py-2">
              <span
                data-testid="tier-badge-mobile"
                className="inline-flex items-center rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)]"
              >
                {tPricing("currentPlan")}: {tierLabel}
              </span>
            </div>
          )}
          <div className="px-3 py-2">
            <LanguageSwitcher />
          </div>
          {navLinks.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2.5 text-sm transition-colors min-h-[44px] ${
                  isActive
                    ? "text-white"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

