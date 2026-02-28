"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// ── Types ───────────────────────────────────────────────────────────────────

export interface BeforeAfterCompareProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Calculate slider position (0–100) from a clientX relative to a container rect. */
export function calcPosition(clientX: number, rect: DOMRect): number {
  return clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BeforeAfterCompare({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}: BeforeAfterCompareProps) {
  const t = useTranslations("result");
  const resolvedBeforeLabel = beforeLabel ?? t("before");
  const resolvedAfterLabel = afterLabel ?? t("after");
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Mouse handler (hover-follow) ───────────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(calcPosition(e.clientX, rect));
  }, []);

  // onMouseLeave: keep last position (no-op)

  // ── Touch handler ─────────────────────────────────────────────────────

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !e.touches[0]) return;
    setPosition(calcPosition(e.touches[0].clientX, rect));
  }, []);

  // ── Keyboard handler ───────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 2;
    if (e.key === "ArrowLeft") {
      setPosition((p) => clamp(p - step, 0, 100));
    } else if (e.key === "ArrowRight") {
      setPosition((p) => clamp(p + step, 0, 100));
    }
  }, []);

  // ── Label visibility ──────────────────────────────────────────────────

  const showBefore = position < 100;
  const showAfter = position > 0;

  return (
    <div data-testid="before-after-compare" className="w-full">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-lg bg-white/5"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        role="slider"
        aria-label="Before and after comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* After image (full background) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt={resolvedAfterLabel}
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* Before image (clipped to left portion) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt={resolvedBeforeLabel}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          {/* Handle indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 bg-[var(--color-primary-bg,#0F172A)]/70 backdrop-blur-sm pointer-events-none">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3m8-6l3 3-3 3" />
            </svg>
          </div>
        </div>

        {/* Labels — visibility depends on position */}
        {showBefore && (
          <span
            data-testid="label-before"
            className="absolute top-3 left-3 rounded bg-black/50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary,#f8fafc)] backdrop-blur-sm"
          >
            {resolvedBeforeLabel}
          </span>
        )}
        {showAfter && (
          <span
            data-testid="label-after"
            className="absolute top-3 right-3 rounded bg-black/50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary,#f8fafc)] backdrop-blur-sm"
          >
            {resolvedAfterLabel}
          </span>
        )}
      </div>
    </div>
  );
}
