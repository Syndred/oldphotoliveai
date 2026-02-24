"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

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

/** Calculate slider position (0–100) from a pointer event relative to a container. */
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
  const [isDragging, setIsDragging] = useState(false);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const allLoaded = beforeLoaded && afterLoaded;

  // ── Pointer handlers ────────────────────────────────────────────────────

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(calcPosition(clientX, rect));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
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

  return (
    <div data-testid="before-after-compare" className="w-full">
      {/* Loading skeleton */}
      {!allLoaded && (
        <div
          data-testid="loading-skeleton"
          className="aspect-[4/3] w-full animate-pulse rounded-lg bg-white/10"
        />
      )}

      {/* Comparison container */}
      <div
        ref={containerRef}
        className={`relative aspect-[4/3] w-full select-none overflow-hidden rounded-lg ${
          allLoaded ? "" : "sr-only"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label="Before and after comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* After image (full background) */}
        <Image
          src={afterUrl}
          alt={resolvedAfterLabel}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          onLoad={() => setAfterLoaded(true)}
          priority
        />

        {/* Before image (clipped to left portion) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={beforeUrl}
            alt={resolvedBeforeLabel}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            onLoad={() => setBeforeLoaded(true)}
            priority
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          {/* Drag handle */}
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

        {/* Labels */}
        <span className="absolute top-3 left-3 rounded bg-black/50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary,#f8fafc)] backdrop-blur-sm">
          {resolvedBeforeLabel}
        </span>
        <span className="absolute top-3 right-3 rounded bg-black/50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary,#f8fafc)] backdrop-blur-sm">
          {resolvedAfterLabel}
        </span>
      </div>
    </div>
  );
}
