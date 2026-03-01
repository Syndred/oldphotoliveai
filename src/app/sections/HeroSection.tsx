"use client";

import { useTranslations } from "next-intl";

export default function HeroSection() {
  const t = useTranslations("landing.hero");

  const scrollToUpload = () => {
    document
      .getElementById("upload-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

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
      <button
        onClick={scrollToUpload}
        className="mt-8 min-h-[44px] w-full max-w-xs rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-8 py-3 text-sm font-semibold text-[var(--color-primary-bg)] transition-opacity hover:opacity-90 sm:w-auto sm:text-base"
      >
        {t("cta")}
      </button>
    </section>
  );
}
