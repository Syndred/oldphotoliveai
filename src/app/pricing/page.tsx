"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import PricingCards from "@/components/PricingCards";
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

export default function PricingPage() {
  const { data: session } = useSession();
  const t = useTranslations("pricing");

  const tier = parseUserTier(
    (session?.user as Record<string, unknown> | undefined)?.tier
  );
  const planLabel =
    tier === "pay_as_you_go"
      ? t("payAsYouGo")
      : tier
        ? t(tier)
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
            </p>
          )}

          <PricingCards />
        </section>
      </main>
    </div>
  );
}
