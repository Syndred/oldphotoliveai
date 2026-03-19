"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BeforeAfterCompare from "@/components/BeforeAfterCompare";
import {
  IMAGE_SHOWCASE_ROWS,
  resolveShowcaseAssetUrl,
  type CompareShowcaseItem,
} from "@/config/showcase";

const VISIBLE_COUNT = 5;

function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return (index + total) % total;
}

function getVisibleItems<T>(items: T[], offset: number, count: number): T[] {
  if (items.length === 0) return [];
  const size = Math.min(count, items.length);
  return Array.from({ length: size }, (_, i) => items[(offset + i) % items.length]);
}

function ArrowButton({
  label,
  direction,
  onClick,
  className,
}: {
  label: string;
  direction: "left" | "right";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-black/70 text-[var(--color-text-primary)] shadow-[0_10px_24px_rgba(0,0,0,0.3)] transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary-bg)] ${className ?? ""}`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        {direction === "left" ? (
          <path d="M12.5 4.5L7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M7.5 4.5L13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

function CompareRow({
  title,
  subtitle,
  items,
  previousLabel,
  nextLabel,
}: {
  title: string;
  subtitle: string;
  items: CompareShowcaseItem[];
  previousLabel: string;
  nextLabel: string;
}) {
  const [offset, setOffset] = useState(0);
  const total = items.length;
  const visibleItems = getVisibleItems(items, offset, VISIBLE_COUNT);

  const handlePrevious = () => {
    setOffset((prev) => wrapIndex(prev - 1, total));
  };

  const handleNext = () => {
    setOffset((prev) => wrapIndex(prev + 1, total));
  };

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4 sm:p-5">
      <div className="mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] sm:text-xl">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
        </div>
      </div>

      <div className="relative">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {visibleItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className={`overflow-hidden rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-1.5 ${
                index > 0 ? "hidden sm:block" : ""
              }`}
            >
              <BeforeAfterCompare
                beforeUrl={resolveShowcaseAssetUrl(item.beforeKey, item.version)}
                afterUrl={resolveShowcaseAssetUrl(item.afterKey, item.version)}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between sm:hidden">
          <ArrowButton label={previousLabel} direction="left" onClick={handlePrevious} />
          <ArrowButton label={nextLabel} direction="right" onClick={handleNext} />
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-1 sm:flex">
          <div className="pointer-events-auto">
            <ArrowButton label={previousLabel} direction="left" onClick={handlePrevious} className="h-8 w-8" />
          </div>
          <div className="pointer-events-auto">
            <ArrowButton label={nextLabel} direction="right" onClick={handleNext} className="h-8 w-8" />
          </div>
        </div>
      </div>
    </article>
  );
}

interface ShowcaseSectionProps {
  title?: string;
  description?: string;
  rowIds?: Array<"restoration" | "colorization">;
}

export default function ShowcaseSection({
  title,
  description,
  rowIds,
}: ShowcaseSectionProps = {}) {
  const t = useTranslations("landing.showcase");
  const rows = rowIds
    ? IMAGE_SHOWCASE_ROWS.filter((row) => rowIds.includes(row.id))
    : IMAGE_SHOWCASE_ROWS;

  return (
    <section id="showcase-section" className="px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {title ?? t("title")}
        </h2>
        {description ? (
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            {description}
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          {rows.map((row) => (
            <CompareRow
              key={row.id}
              title={t(row.titleKey)}
              subtitle={t(row.subtitleKey)}
              items={row.items}
              previousLabel={t("controls.previous")}
              nextLabel={t("controls.next")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
