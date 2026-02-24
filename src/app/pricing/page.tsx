"use client";

import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import PricingCards from "@/components/PricingCards";

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <section aria-labelledby="pricing-title">
          <h1 id="pricing-title" className="mb-2 text-center text-3xl font-bold text-[var(--color-text-primary)]">
            {t("title")}
          </h1>
          <p className="mb-10 text-center text-[var(--color-text-secondary)]">
            {t("subtitle")}
          </p>

          <PricingCards />
        </section>
      </main>
    </div>
  );
}
