"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { UserTier } from "@/types";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface PricingPlan {
  id: "free" | "pay_as_you_go" | "professional";
  nameKey: string;
  price: string;
  period: string;
  descKey: string;
  featureKeys: string[];
  ctaKey: string;
  highlighted: boolean;
  plan?: "pay_as_you_go" | "professional";
}

interface PricingCardsProps {
  paygRemaining?: number | null;
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
    price: "$0",
    period: "",
    descKey: "freeDesc",
    featureKeys: ["freeFeature1", "freeFeature2", "freeFeature3"],
    ctaKey: "free",
    highlighted: false,
  },
  {
    id: "pay_as_you_go",
    nameKey: "payAsYouGo",
    price: "$4.99",
    period: "/ 5 credits",
    descKey: "payAsYouGoDesc",
    featureKeys: ["payFeature1", "payFeature2", "payFeature3"],
    ctaKey: "buyCredits",
    highlighted: false,
    plan: "pay_as_you_go",
  },
  {
    id: "professional",
    nameKey: "professional",
    price: "$9.99",
    period: "/ month",
    descKey: "professionalDesc",
    featureKeys: [
      "proFeature1",
      "proFeature2",
      "proFeature3",
      "proFeature4",
    ],
    ctaKey: "subscribe",
    highlighted: true,
    plan: "professional",
  },
];

export default function PricingCards({
  paygRemaining = null,
}: PricingCardsProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const t = useTranslations("pricing");
  const tQuota = useTranslations("quota");
  const tErrors = useTranslations("errors");

  const currentTier = parseUserTier(
    (session?.user as Record<string, unknown> | undefined)?.tier
  );
  const currentPlanId: PricingPlan["id"] = currentTier ?? "free";

  async function handleCheckout(plan: "pay_as_you_go" | "professional") {
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

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrentPlan = p.id === currentPlanId;
          const isHighlighted = p.highlighted || isCurrentPlan;
          const checkoutPlan = p.plan;

          return (
            <div
              key={p.id}
              data-testid={`plan-${p.id}`}
              className={`relative rounded-2xl border p-6 transition-shadow ${
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

              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t(p.nameKey)}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {t(p.descKey)}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {p.price}
                </span>
                {p.period && (
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {p.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 space-y-2">
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
                  <span className="block w-full rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-3 text-center text-sm text-[var(--color-text-primary)] min-h-[44px]">
                    <span className="block">{t("currentPlan")}</span>
                    {p.id === "pay_as_you_go" && paygRemaining !== null && (
                      <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                        {tQuota("remaining", { count: paygRemaining })}
                      </span>
                    )}
                  </span>
                ) : checkoutPlan ? (
                  <button
                    onClick={() => handleCheckout(checkoutPlan)}
                    disabled={loadingPlan !== null}
                    className={`w-full rounded-lg py-3 text-sm font-medium transition-colors min-h-[44px] ${
                      p.highlighted
                        ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
                        : "bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white hover:opacity-90"
                    } disabled:opacity-50`}
                  >
                    {loadingPlan === checkoutPlan ? t("redirecting") : t(p.ctaKey)}
                  </button>
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
