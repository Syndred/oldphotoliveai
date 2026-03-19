"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

interface FaqItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  items?: FaqItem[];
}

export default function FAQSection({ title, items }: FAQSectionProps = {}) {
  const t = useTranslations("landing.faq");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const resolvedItems =
    items ?? FAQ_KEYS.map((key) => ({ question: t(key), answer: t(key.replace("q", "a") as `a${string}`) }));

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {title ?? t("title")}
        </h2>

        <div className="mt-8 space-y-3">
          {resolvedItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)]"
              >
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left sm:px-6"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-[var(--color-text-primary)] sm:text-base">
                    {item.question}
                  </span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                <div
                  className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? "500px" : "0px" }}
                >
                  <p className="px-4 pb-4 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:px-6">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
