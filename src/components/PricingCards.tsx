"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { UserTier } from "@/types";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  CREDIT_PACKS,
  type CreditPackPlan,
  PROFESSIONAL_MONTHLY_DISPLAY_PRICE,
} from "@/lib/billing";

interface PricingPlan {
  id: "free" | CreditPackPlan | "professional";
  nameKey: string;
  badgeKey: string;
  price: string;
  periodKey?: string;
  periodValues?: Record<string, number>;
  priceNoteKey: string;
  descKey: string;
  featureKeys: string[];
  ctaKey: string;
  highlighted: boolean;
  checkoutPlan?: CreditPackPlan | "professional";
  hiddenUnlessCurrent?: boolean;
}

interface PricingCardsProps {
  currentTier?: UserTier | null;
  hasActiveStripeSubscription?: boolean;
}

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

const PLANS: PricingPlan[] = [
  {
    id: "free",
    nameKey: "free",
    badgeKey: "freeBadge",
    price: "$0",
    priceNoteKey: "freePriceNote",
    descKey: "freeDesc",
    featureKeys: [
      "freeFeature1",
      "freeFeature2",
      "freeFeature3",
      "freeFeature4",
    ],
    ctaKey: "free",
    highlighted: false,
  },
  {
    id: "starter_pack",
    nameKey: "starterPack",
    badgeKey: "starterPackBadge",
    price: CREDIT_PACKS.starter_pack.displayPrice,
    periodKey: "creditPackPeriod",
    periodValues: { count: CREDIT_PACKS.starter_pack.credits },
    priceNoteKey: "starterPackPriceNote",
    descKey: "starterPackDesc",
    featureKeys: [
      "starterPackFeature1",
      "starterPackFeature2",
      "starterPackFeature3",
      "starterPackFeature4",
    ],
    ctaKey: "buyPack",
    highlighted: false,
    checkoutPlan: "starter_pack",
  },
  {
    id: "family_pack",
    nameKey: "familyPack",
    badgeKey: "familyPackBadge",
    price: CREDIT_PACKS.family_pack.displayPrice,
    periodKey: "creditPackPeriod",
    periodValues: { count: CREDIT_PACKS.family_pack.credits },
    priceNoteKey: "familyPackPriceNote",
    descKey: "familyPackDesc",
    featureKeys: [
      "familyPackFeature1",
      "familyPackFeature2",
      "familyPackFeature3",
      "familyPackFeature4",
    ],
    ctaKey: "buyPack",
    highlighted: true,
    checkoutPlan: "family_pack",
  },
  {
    id: "archive_pack",
    nameKey: "archivePack",
    badgeKey: "archivePackBadge",
    price: CREDIT_PACKS.archive_pack.displayPrice,
    periodKey: "creditPackPeriod",
    periodValues: { count: CREDIT_PACKS.archive_pack.credits },
    priceNoteKey: "archivePackPriceNote",
    descKey: "archivePackDesc",
    featureKeys: [
      "archivePackFeature1",
      "archivePackFeature2",
      "archivePackFeature3",
      "archivePackFeature4",
    ],
    ctaKey: "buyPack",
    highlighted: false,
    checkoutPlan: "archive_pack",
  },
  {
    id: "professional",
    nameKey: "professional",
    badgeKey: "professionalBadge",
    price: PROFESSIONAL_MONTHLY_DISPLAY_PRICE,
    periodKey: "professionalPeriod",
    priceNoteKey: "professionalPriceNote",
    descKey: "professionalDesc",
    featureKeys: [
      "proFeature1",
      "proFeature2",
      "proFeature3",
      "proFeature4",
      "proFeature5",
    ],
    ctaKey: "subscribe",
    highlighted: true,
    checkoutPlan: "professional",
    hiddenUnlessCurrent: true,
  },
];

export default function PricingCards({
  currentTier: currentTierProp,
  hasActiveStripeSubscription = false,
}: PricingCardsProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const t = useTranslations("pricing");
  const tErrors = useTranslations("errors");

  const sessionTier = parseUserTier(
    (session?.user as Record<string, unknown> | undefined)?.tier
  );
  const currentTier = currentTierProp ?? sessionTier;
  const currentPlanId = currentTier ?? "free";
  const professionalIncludesCredits = currentPlanId === "professional";

  async function handleCheckout(plan: CreditPackPlan | "professional") {
    if (plan !== "professional" && professionalIncludesCredits) {
      setError(tErrors("professionalAlreadyIncludesCredits"));
      return;
    }

    setLoadingPlan(plan);
    setError(null);
    trackAnalyticsEvent("checkout_started", { plan });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show friendly message for unavailable payment feature
        if (res.status === 503) {
          throw new Error(tErrors("paymentUnavailable"));
        }
        throw new Error(data.error ?? tErrors("checkoutFailed"));
      }
      if (data.url) {
        trackAnalyticsEvent("checkout_redirected", { plan });
        window.location.href = data.url;
      }
    } catch (err) {
      trackAnalyticsEvent("checkout_failed", { plan });
      setError(err instanceof Error ? err.message : tErrors("checkoutFailed"));
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleBillingPortal() {
    setLoadingPlan("manage_subscription");
    setError(null);
    trackAnalyticsEvent("billing_portal_started");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error(tErrors("paymentUnavailable"));
        }
        throw new Error(data.error ?? tErrors("billingPortalFailed"));
      }
      if (data.url) {
        trackAnalyticsEvent("billing_portal_redirected");
        window.location.href = data.url;
      }
    } catch (err) {
      trackAnalyticsEvent("billing_portal_failed");
      setError(
        err instanceof Error ? err.message : tErrors("billingPortalFailed")
      );
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.filter(
          (p) => !p.hiddenUnlessCurrent || p.id === currentPlanId
        ).map((p) => {
          const isCurrentPlan =
            (p.id === "free" && currentPlanId === "free") ||
            (p.id === "professional" && currentPlanId === "professional");
          const isHighlighted = p.highlighted || isCurrentPlan;
          const checkoutPlan = p.checkoutPlan;
          const periodLabel = p.periodKey
            ? t(p.periodKey, p.periodValues)
            : "";
          const isPaygBlockedForProfessional =
            checkoutPlan !== "professional" && professionalIncludesCredits;

          return (
            <div
              key={p.id}
              data-testid={`plan-${p.id}`}
              className={`relative flex min-h-full flex-col rounded-2xl border p-6 transition-shadow ${
                isHighlighted
                  ? "border-[var(--color-accent)] bg-gradient-to-b from-[var(--color-accent)]/10 to-transparent shadow-lg shadow-[var(--color-accent)]/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {p.highlighted && !isCurrentPlan && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-3 py-0.5 text-xs font-semibold text-white">
                  {t("recommended")}
                </span>
              )}

              <div className="flex min-h-[32px] items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t(p.nameKey)}
                </h2>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  {t(p.badgeKey)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {t(p.descKey)}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {p.price}
                </span>
                {periodLabel && (
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {periodLabel}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                {t(p.priceNoteKey)}
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {p.featureKeys.map((fk) => (
                  <li
                    key={fk}
                    className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                  >
                    <span className="mt-0.5 text-[var(--color-accent)]">{"\u2713"}</span>
                    {t(fk)}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrentPlan ? (
                  p.id === "professional" && hasActiveStripeSubscription ? (
                    <div className="space-y-3">
                      <span className="block w-full rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-3 text-center text-sm text-[var(--color-text-primary)] min-h-[44px]">
                        <span className="block">{t("currentPlan")}</span>
                      </span>
                      <button
                        onClick={() => handleBillingPortal()}
                        disabled={loadingPlan !== null}
                        className="w-full rounded-lg bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-50 min-h-[44px]"
                      >
                        {loadingPlan === "manage_subscription"
                          ? t("redirecting")
                          : t("manageSubscription")}
                      </button>
                    </div>
                  ) : (
                    <span className="block w-full rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-3 text-center text-sm text-[var(--color-text-primary)] min-h-[44px]">
                      <span className="block">{t("currentPlan")}</span>
                    </span>
                  )
                ) : isPaygBlockedForProfessional ? (
                  <span className="block w-full rounded-lg border border-white/10 py-3 text-center text-sm text-[var(--color-text-secondary)] min-h-[44px]">
                    {t("includedInProfessional")}
                  </span>
                ) : checkoutPlan ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleCheckout(checkoutPlan)}
                      disabled={loadingPlan !== null}
                      className={`w-full rounded-lg py-3 text-sm font-medium transition-colors min-h-[44px] ${
                        p.highlighted
                          ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
                          : "bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white hover:opacity-90"
                      } disabled:opacity-50`}
                    >
                      {loadingPlan === checkoutPlan
                        ? t("redirecting")
                        : t(p.ctaKey)}
                    </button>
                  </div>
                ) : (
                  <span className="block w-full rounded-lg border border-white/10 py-3 text-center text-sm text-[var(--color-text-secondary)] min-h-[44px]">
                    {t(p.ctaKey)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
