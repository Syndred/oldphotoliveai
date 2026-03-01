"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import PricingCards from "@/components/PricingCards";
import type { QuotaInfo, UserTier } from "@/types";

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
  const t = useTranslations("pricing");
  const tQuota = useTranslations("quota");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

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
        // Keep page usable even when quota API is unavailable.
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

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <section aria-labelledby="pricing-title">
          <h1 id="pricing-title" className="mb-2 text-center text-3xl font-bold text-[var(--color-text-primary)]">
            {t("title")}
          </h1>
          <p className="mb-3 text-center text-[var(--color-text-secondary)]">
            {t("subtitle")}
          </p>
          {planLabel && (
            <p
              data-testid="current-plan-summary"
              className="mb-8 text-center text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base"
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
          )}

          <PricingCards paygRemaining={paygRemaining} />
        </section>
      </main>
    </div>
  );
}
