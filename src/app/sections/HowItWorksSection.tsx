"use client";

import { useTranslations } from "next-intl";

const STEPS = [
  { key: "step1" as const, number: 1 },
  { key: "step2" as const, number: 2 },
  { key: "step3" as const, number: 3 },
] as const;

export default function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");

  return (
    <section id="how-it-works-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
          {t("subtitle")}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div key={step.key} className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-xl font-bold text-[var(--color-primary-bg)]">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                {t(`${step.key}.title`)}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {t(`${step.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
