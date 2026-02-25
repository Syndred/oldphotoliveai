"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import ProgressIndicator from "@/components/ProgressIndicator";
import BeforeAfterCompare from "@/components/BeforeAfterCompare";
import VideoPlayer from "@/components/VideoPlayer";
import { buildCdnUrl } from "@/lib/url";

// Re-export for backward compatibility (tests import from this file)
export { buildCdnUrl } from "@/lib/url";

// ── Types ───────────────────────────────────────────────────────────────────

interface TaskResult {
  originalImageKey: string;
  colorizedImageKey: string;
  animationVideoKey: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [isFreeTier, setIsFreeTier] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [needsPolling, setNeedsPolling] = useState(false);
  const tResult = useTranslations("result");
  const tProcessing = useTranslations("processing");
  const tCommon = useTranslations("common");

  // Fetch user tier for watermark decision
  useEffect(() => {
    fetch("/api/quota")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.tier && data.tier !== "free") setIsFreeTier(false);
      })
      .catch(() => { /* default to free tier = show watermark */ });
  }, []);

  // First, fetch task status via REST API to check if already completed
  useEffect(() => {
    if (!taskId) return;

    fetch(`/api/tasks/${taskId}/status`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Failed to load task")))
      .then((data) => {
        if (data.status === "completed" && data.colorizedImageKey && data.animationVideoKey) {
          setResult({
            originalImageKey: data.originalImageKey ?? "",
            colorizedImageKey: data.colorizedImageKey,
            animationVideoKey: data.animationVideoKey,
          });
        } else if (data.status === "failed") {
          setError(data.errorMessage || "Processing failed");
        } else {
          // Task is still processing — need SSE polling
          setNeedsPolling(true);
        }
      })
      .catch(() => {
        // If status API fails, fall back to SSE
        setNeedsPolling(true);
      })
      .finally(() => setInitialLoading(false));
  }, [taskId]);

  const handleComplete = useCallback(
    (data: { status: string; progress: number; [key: string]: unknown }) => {
      setResult({
        originalImageKey: (data.originalImageKey as string) ?? "",
        colorizedImageKey: data.colorizedImageKey as string,
        animationVideoKey: data.animationVideoKey as string,
      });
      setError(null);
    },
    [],
  );

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setResult(null);
  }, []);

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Retry failed");
      }
      // Reload to reconnect SSE with fresh state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  const showProgress = needsPolling && !result && !error;

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        {/* Initial loading */}
        {initialLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        )}

        {/* Progress — only for tasks still processing */}
        {!initialLoading && showProgress && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-10">
            <h1 className="mb-6 text-center text-2xl font-bold text-[var(--color-text-primary)]">
              {tProcessing("title")}
            </h1>
            <ProgressIndicator
              taskId={taskId}
              onComplete={handleComplete}
              onError={handleError}
            />
          </div>
        )}

        {/* Error */}
        {!initialLoading && error && !result && (
          <div
            className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center sm:p-10"
            role="alert"
          >
            <svg
              className="mx-auto mb-4 h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <h2 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
              {tResult("failed")}
            </h2>
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">{error}</p>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 min-h-[44px]"
            >
              {retrying ? tResult("retrying") : tCommon("retry")}
            </button>
          </div>
        )}

        {/* Results */}
        {!initialLoading && result && (
          <div className="space-y-8">
            {/* Before / After */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                {tResult("beforeAfter")}
              </h2>
              <BeforeAfterCompare
                beforeUrl={buildCdnUrl(result.originalImageKey)}
                afterUrl={buildCdnUrl(result.colorizedImageKey)}
              />
            </section>

            {/* Video */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                {tResult("animation")}
              </h2>
              <VideoPlayer src={buildCdnUrl(result.animationVideoKey)} showWatermark={isFreeTier} />
            </section>

            {/* Download buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={buildCdnUrl(result.colorizedImageKey)}
                download
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 min-h-[44px]"
              >
                <DownloadIcon />
                {tResult("downloadImage")}
              </a>
              <a
                href={buildCdnUrl(result.animationVideoKey)}
                download
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] px-6 py-3 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/10 min-h-[44px]"
              >
                <DownloadIcon />
                {tResult("downloadVideo")}
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
