"use client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface VideoPlayerProps {
  /** Video CDN URL */
  src: string;
  /** Optional poster image URL */
  poster?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <div data-testid="video-player" className="w-full">
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-lg bg-black/20"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
