"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { UserTier } from "@/types";

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

interface AuthButtonProps {
  tierBadgeText?: string | null;
}

export default function AuthButton({ tierBadgeText = null }: AuthButtonProps) {
  const { data: session, status } = useSession();
  const t = useTranslations("nav");
  const tPricing = useTranslations("pricing");
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const tier = parseUserTier(
    (session?.user as Record<string, unknown> | undefined)?.tier
  );
  const fallbackTierLabel =
    tier === "pay_as_you_go"
      ? tPricing("payAsYouGo")
      : tier
        ? tPricing(tier)
        : null;
  const tierLabel = tierBadgeText ?? fallbackTierLabel;

  if (status === "loading") {
    return (
      <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => { setSigningIn(true); signIn("google"); }}
        disabled={signingIn}
        className="min-h-[44px] whitespace-nowrap rounded-md bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:px-4 sm:text-sm"
      >
        {signingIn ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </span>
        ) : t("login")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {session.user?.image && (
        <Image
          src={session.user.image}
          alt={session.user.name ?? "User avatar"}
          width={32}
          height={32}
          className="hidden rounded-full sm:block"
        />
      )}
      <span className="hidden text-sm text-[var(--color-text-secondary)] sm:inline">
        {session.user?.name}
      </span>
      {tierLabel && (
        <span
          data-testid="auth-tier-badge"
          className="hidden items-center rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/12 px-2 py-0.5 text-xs font-medium text-[var(--color-accent)] sm:inline-flex"
        >
          {tierLabel}
        </span>
      )}
      <button
        onClick={() => { setSigningOut(true); signOut(); }}
        disabled={signingOut}
        className="min-h-[44px] whitespace-nowrap rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-white/40 hover:text-white disabled:opacity-60 sm:px-3 sm:text-sm"
      >
        {signingOut ? (
          <span className="h-4 w-4 inline-block animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : t("logout")}
      </button>
    </div>
  );
}
