"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface HeroSectionProps {
  children?: ReactNode;
}

export default function HeroSection({ children }: HeroSectionProps) {
  const t = useTranslations("landing.hero");
  const signals = ["signal1", "signal2", "signal3", "signal4"];

  return (
    <section
      id="hero-section"
      className="flex flex-col items-center justify-center px-4 py-10 text-center sm:py-16"
    >
      <h1 className="max-w-3xl bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-5xl md:text-6xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
        {t("subtitle")}
      </p>
      <div className="mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
        {signals.map((signal) => (
          <span
            key={signal}
            className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] sm:text-sm"
          >
            {t(signal)}
          </span>
        ))}
      </div>
      {children}
    </section>
  );
}
