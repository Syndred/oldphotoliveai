"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import AuthButton from "./AuthButton";
import BrandLogo from "./BrandLogo";
import { Link, usePathname } from "@/i18n/navigation";
import type { QuotaInfo, UserTier } from "@/types";

function parseUserTier(value: unknown): UserTier | null {
  return value === "free" || value === "pay_as_you_go" || value === "professional" ? value : null;
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const tPricing = useTranslations("pricing");
  const tQuota = useTranslations("quota");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const sessionTier = parseUserTier((session?.user as Record<string, unknown> | undefined)?.tier);

  useEffect(() => {
    if (status !== "authenticated") {
      setQuota(null);
      return;
    }
    const controller = new AbortController();
    fetch("/api/quota", { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setQuota((await response.json()) as QuotaInfo);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [status]);

  const tier = quota?.tier ?? sessionTier;
  const tierBaseLabel = tier === "pay_as_you_go" ? tPricing("payAsYouGo") : tier ? tPricing(tier) : null;
  const remaining = tier === "pay_as_you_go" && quota ? quota.credits ?? quota.remaining : null;
  const tierLabel = tierBaseLabel && remaining !== null ? `${tierBaseLabel} | ${tQuota("remaining", { count: remaining })}` : tierBaseLabel;
  const linkClass = "flex min-h-[44px] items-center rounded-md px-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-white";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-primary-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="min-w-0"><BrandLogo textClassName="text-base sm:text-lg" iconClassName="h-9 w-9 sm:h-10 sm:w-10" /></Link>
        <div className="hidden items-center gap-1 sm:flex">
          <a href="#how-it-works-section" className={linkClass}>How It Works</a>
          <Link href="/pricing" className={pathname.startsWith("/pricing") ? `${linkClass} text-white` : linkClass}>Pricing</Link>
          {status === "authenticated" ? <Link href="/history" className={pathname.startsWith("/history") ? `${linkClass} text-white` : linkClass}>History</Link> : null}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <AuthButton tierBadgeText={tierLabel} />
          <button type="button" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-text-secondary)] sm:hidden" aria-label="Toggle navigation menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
            <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      {mobileMenuOpen ? (
        <div className="border-t border-white/10 px-4 py-3 sm:hidden">
          {tierLabel ? <div className="mb-2"><span data-testid="tier-badge-mobile" className="inline-flex rounded-full border border-[var(--color-accent)]/40 px-2.5 py-1 text-xs text-[var(--color-accent)]">{tPricing("currentPlan")}: {tierLabel}</span></div> : null}
          <a href="#how-it-works-section" onClick={() => setMobileMenuOpen(false)} className={linkClass}>How It Works</a>
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className={linkClass}>Pricing</Link>
          {status === "authenticated" ? <Link href="/history" onClick={() => setMobileMenuOpen(false)} className={linkClass}>History</Link> : null}
        </div>
      ) : null}
    </nav>
  );
}
