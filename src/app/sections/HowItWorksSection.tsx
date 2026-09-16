"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const STEPS = [
  { key: "step1" as const, number: 1 },
  { key: "step2" as const, number: 2 },
  { key: "step3" as const, number: 3 },
] as const;

export interface HowItWorksCopy {
  title: string;
  subtitle: string;
  steps: ReadonlyArray<{ title: string; description: string; href?: string }>;
}

export default function HowItWorksSection({ copy }: { copy?: HowItWorksCopy }) {
  const t = useTranslations("landing.howItWorks");
  const resolvedSteps: ReadonlyArray<{ title: string; description: string; href?: string }> = copy?.steps ?? STEPS.map((step) => ({
    title: t(`${step.key}.title`),
    description: t(`${step.key}.description`),
  }));

  return (
    <section id="how-it-works-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {copy?.title ?? t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
          {copy?.subtitle ?? t("subtitle")}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
          {resolvedSteps.map((step, index) => {
            const content = (
              <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-xl font-bold text-[var(--color-primary-bg)]">
                {index + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {step.description}
              </p>
              {step.href ? <span className="mt-4 text-sm font-medium text-[var(--color-accent)]">Explore {step.title} →</span> : null}
              </>
            );

            return step.href ? (
              <Link key={step.title} href={step.href} className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-transparent p-5 text-center transition hover:border-white/10 hover:bg-white/[0.03]">
                {content}
              </Link>
            ) : (
              <div key={step.title} className="mx-auto flex max-w-md flex-col items-center p-5 text-center">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
