"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import VideoPlayer from "@/components/VideoPlayer";
import {
  VIDEO_SHOWCASE_ITEMS,
  resolveShowcaseAssetUrl,
  type VideoShowcaseItem,
} from "@/config/showcase";

const VISIBLE_COUNT = 3;

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

interface VideoShowcaseSectionProps {
  title?: string;
  subtitle?: string;
}

export default function VideoShowcaseSection({
  title,
  subtitle,
}: VideoShowcaseSectionProps = {}) {
  const t = useTranslations("landing.videoShowcase");
  const [offset, setOffset] = useState(0);
  const total = VIDEO_SHOWCASE_ITEMS.length;
  const visibleItems = getVisibleItems(VIDEO_SHOWCASE_ITEMS, offset, VISIBLE_COUNT);

  const handlePrevious = () => {
    setOffset((prev) => wrapIndex(prev - 1, total));
  };

  const handleNext = () => {
    setOffset((prev) => wrapIndex(prev + 1, total));
  };

  return (
    <section id="video-showcase-section" className="px-4 pt-0 pb-8 sm:pb-12">
      <div className="mx-auto max-w-6xl">
        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4 sm:p-5">
          <div className="mb-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] sm:text-xl">
                {title ?? t("title")}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {subtitle ?? t("subtitle")}
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {visibleItems.map((item, index) => (
                <VideoCard
                  key={`${item.id}-${index}`}
                  item={item}
                  className={index > 0 ? "hidden sm:block" : ""}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between sm:hidden">
              <ArrowButton label={t("controls.previous")} direction="left" onClick={handlePrevious} />
              <ArrowButton label={t("controls.next")} direction="right" onClick={handleNext} />
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-1 sm:flex">
              <div className="pointer-events-auto">
                <ArrowButton label={t("controls.previous")} direction="left" onClick={handlePrevious} className="h-8 w-8" />
              </div>
              <div className="pointer-events-auto">
                <ArrowButton label={t("controls.next")} direction="right" onClick={handleNext} className="h-8 w-8" />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function VideoCard({
  item,
  className,
}: {
  item: VideoShowcaseItem;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-1.5 ${className ?? ""}`}
    >
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-black/20">
        <VideoPlayer
          src={resolveShowcaseAssetUrl(item.videoKey, item.version)}
          containerClassName="h-full"
          videoClassName="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
