"use client";

import { useTranslations } from "next-intl";

// ── Types ───────────────────────────────────────────────────────────────────

export interface VideoPlayerProps {
  /** Video CDN URL */
  src: string;
  /** Optional poster image URL */
  poster?: string;
  /** Show watermark overlay (for free tier users) */
  showWatermark?: boolean;
  /** Optional class for outer container */
  containerClassName?: string;
  /** Optional class for video element */
  videoClassName?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function VideoPlayer({
  src,
  poster,
  showWatermark = false,
  containerClassName,
  videoClassName,
}: VideoPlayerProps) {
  const t = useTranslations("common");

  return (
    <div
      data-testid="video-player"
      className={`relative w-full ${containerClassName ?? ""}`.trim()}
    >
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className={`w-full rounded-lg bg-black/20 ${videoClassName ?? ""}`.trim()}
      >
        {t("videoNotSupported")}
      </video>
      {showWatermark && (
        <div
          data-testid="video-watermark"
          className="pointer-events-none absolute inset-0 flex items-end justify-end rounded-lg p-4"
        >
          <span className="text-sm font-medium text-white/30 select-none">
            OldPhotoLive AI
          </span>
        </div>
      )}
    </div>
  );
}
