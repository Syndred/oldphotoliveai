"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import PricingCards from "@/components/PricingCards";
import type { QuotaInfo, SubscriptionStatus, UserTier } from "@/types";

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

export default function PricingPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations("pricing");
  const tQuota = useTranslations("quota");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setQuota(null);
      setSubscriptionStatus(null);
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
        // Keep page usable even when quota API is unavailable.
      });

    fetch("/api/stripe/subscription", { signal: abortController.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as SubscriptionStatus;
        setSubscriptionStatus(data);
      })
      .catch(() => {
        // Keep page usable even when subscription status is unavailable.
      });

    return () => {
      abortController.abort();
    };
  }, [status]);

  const sessionTier = parseUserTier(
    (session?.user as Record<string, unknown> | undefined)?.tier
  );
  const tier = quota?.tier ?? sessionTier;
  const planLabel =
    tier === "pay_as_you_go"
      ? t("payAsYouGo")
      : tier
        ? t(tier)
        : null;
  const paygRemaining =
    tier === "pay_as_you_go" && quota
      ? quota.credits ?? quota.remaining
      : null;
  const scheduledCancellationDate =
    tier === "professional" &&
    subscriptionStatus?.cancelAtPeriodEnd &&
    subscriptionStatus.currentPeriodEnd
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
          new Date(subscriptionStatus.currentPeriodEnd)
        )
      : null;

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <section aria-labelledby="pricing-title">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            {t("eyebrow")}
          </p>
          <h1 id="pricing-title" className="mt-3 text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            {t("subtitle")}
          </p>
          <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
            {["valueProp1", "valueProp2", "valueProp3"].map((key) => (
              <div
                key={key}
                className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]"
              >
                {t(key)}
              </div>
            ))}
          </div>
          {planLabel && (
            <div className="mt-6 space-y-2 text-center">
              <p
                data-testid="current-plan-summary"
                className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base"
              >
                {t("currentPlan")}:{" "}
                <span className="font-medium text-[var(--color-text-primary)]">
                  {planLabel}
                </span>
                {paygRemaining !== null && (
                  <span className="ml-2 text-[var(--color-text-secondary)]">
                    ({tQuota("remaining", { count: paygRemaining })})
                  </span>
                )}
              </p>
              {scheduledCancellationDate && (
                <p
                  data-testid="scheduled-cancellation-summary"
                  className="text-sm text-amber-300"
                >
                  {t("scheduledCancellation", {
                    date: scheduledCancellationDate,
                  })}
                </p>
              )}
            </div>
          )}

          <div className="mt-8">
            <PricingCards
              currentTier={tier}
              hasActiveStripeSubscription={Boolean(
                subscriptionStatus?.hasActiveSubscription
              )}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
