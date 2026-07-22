"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import AuthButton from "./AuthButton";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import { Link, usePathname } from "@/i18n/navigation";
import { getToolPagePath, getToolPageSummaries } from "@/content/tool-pages";
import type { Locale } from "@/i18n/routing";
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
  const locale = useLocale() as Locale;
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
  const productLinks = getToolPageSummaries(locale);
  const hasActiveProduct = productLinks.some((tool) =>
    pathname.startsWith(getToolPagePath(tool.slug))
  );

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
          <div className="group relative">
            <button
              type="button"
              className={`flex min-h-[44px] items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors ${
                hasActiveProduct
                  ? "text-white"
                  : "text-[var(--color-text-secondary)] hover:text-white"
              }`}
              aria-haspopup="true"
            >
              {t("products")}
              <svg
                className="h-4 w-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path d="M5 7.5 10 12l5-4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="invisible absolute left-0 top-full z-50 w-72 translate-y-2 rounded-xl border border-white/10 bg-[var(--color-primary-bg)]/95 p-2 opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {productLinks.map((tool) => {
                const href = getToolPagePath(tool.slug);
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={tool.slug}
                    href={href}
                    className={`block rounded-lg px-3 py-2.5 transition-colors ${
                      isActive
                        ? "bg-white/[0.08] text-white"
                        : "text-[var(--color-text-secondary)] hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span className="block text-sm font-medium">
                      {tool.cardTitle}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">
                      {tool.eyebrow}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
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
          <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            {t("products")}
          </div>
          {productLinks.map((tool) => {
            const href = getToolPagePath(tool.slug);
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={tool.slug}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2.5 text-sm transition-colors min-h-[44px] ${
                  isActive
                    ? "text-white"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {tool.cardTitle}
              </Link>
            );
          })}
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
