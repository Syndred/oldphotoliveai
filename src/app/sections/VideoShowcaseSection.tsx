"use client";

import { useTranslations } from "next-intl";
import VideoPlayer from "@/components/VideoPlayer";
import { buildCdnUrl } from "@/lib/url";

const VIDEO_URL = buildCdnUrl("showcase/animation.mp4");

export default function VideoShowcaseSection() {
  const t = useTranslations("landing.videoShowcase");

  return (
    <section id="video-showcase-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-3 text-center text-[var(--color-text-secondary)]">
          {t("subtitle")}
        </p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-2">
          <VideoPlayer src={VIDEO_URL} />
        </div>
      </div>
    </section>
  );
}
