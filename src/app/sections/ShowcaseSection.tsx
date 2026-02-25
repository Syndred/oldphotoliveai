"use client";

import { useTranslations } from "next-intl";
import BeforeAfterCompare from "@/components/BeforeAfterCompare";

const R2_BASE = "https://pub-1d53303d843e4e19a071284a6933ffb6.r2.dev";

const SHOWCASE_ITEMS = [
  {
    beforeUrl: `${R2_BASE}/tasks/acbfdf8a-19a1-47a9-a7ed-f1ee883ef013/original.jpg`,
    afterUrl: `${R2_BASE}/tasks/acbfdf8a-19a1-47a9-a7ed-f1ee883ef013/restored.jpg`,
    labelKey: "items.label1" as const,
  },
  {
    beforeUrl: `${R2_BASE}/tasks/acbfdf8a-19a1-47a9-a7ed-f1ee883ef013/original.jpg`,
    afterUrl: `${R2_BASE}/tasks/acbfdf8a-19a1-47a9-a7ed-f1ee883ef013/colorized.jpg`,
    labelKey: "items.label2" as const,
  },
  {
    beforeUrl: `${R2_BASE}/tasks/acbfdf8a-19a1-47a9-a7ed-f1ee883ef013/restored.jpg`,
    afterUrl: `${R2_BASE}/tasks/acbfdf8a-19a1-47a9-a7ed-f1ee883ef013/colorized.jpg`,
    labelKey: "items.label3" as const,
  },
];

export default function ShowcaseSection() {
  const t = useTranslations("landing.showcase");

  return (
    <section id="showcase-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-3 text-center text-[var(--color-text-secondary)]">
          {t("subtitle")}
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE_ITEMS.map((item) => (
            <div
              key={item.labelKey}
              className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-2"
            >
              <BeforeAfterCompare
                beforeUrl={item.beforeUrl}
                afterUrl={item.afterUrl}
                beforeLabel={t(item.labelKey) + " — Before"}
                afterLabel={t(item.labelKey) + " — After"}
              />
              <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
                {t(item.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
