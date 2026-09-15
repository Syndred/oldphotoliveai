"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import ProgressIndicator from "@/components/ProgressIndicator";
import BeforeAfterCompare from "@/components/BeforeAfterCompare";
import VideoPlayer from "@/components/VideoPlayer";
import { buildTaskAssetUrl } from "@/lib/task-assets";
import { resolveTaskErrorMessage } from "@/lib/task-error";
import { trackAnalyticsEvent, trackTaskEventOnce } from "@/lib/analytics";

// ── Types ───────────────────────────────────────────────────────────────────

interface TaskResult {
  originalImageKey: string;
  restoredImageKey?: string;
  colorizedImageKey?: string;
  animationVideoKey?: string;
}

interface TaskContext {
  workflow: string;
  accessMode: string;
  attemptCount: number;
  retryAllowed: boolean;
}

function readTaskContext(
  data: Record<string, unknown>,
  previous: TaskContext
): TaskContext {
  const attempt = Number(data.attemptCount);
  const failureCode =
    typeof data.failureCode === "string" ? data.failureCode : "";
  return {
    workflow:
      typeof data.workflow === "string" ? data.workflow : previous.workflow,
    accessMode:
      typeof data.accessMode === "string"
        ? data.accessMode
        : previous.accessMode,
    attemptCount: Number.isFinite(attempt)
      ? Math.max(1, Math.floor(attempt))
      : previous.attemptCount,
    retryAllowed:
      typeof data.retryAllowed === "boolean"
        ? data.retryAllowed
        : data.status === "failed" &&
          failureCode !== "content_rejected" &&
          failureCode !== "provider_creation_unknown",
  };
}

function getTaskResult(data: Record<string, unknown>): TaskResult | null {
  const restoredImageKey =
    typeof data.restoredImageKey === "string" ? data.restoredImageKey : undefined;
  const colorizedImageKey =
    typeof data.colorizedImageKey === "string" ? data.colorizedImageKey : undefined;
  const animationVideoKey =
    typeof data.animationVideoKey === "string" ? data.animationVideoKey : undefined;

  if (!restoredImageKey && !colorizedImageKey && !animationVideoKey) {
    return null;
  }

  return {
    originalImageKey:
      typeof data.originalImageKey === "string" ? data.originalImageKey : "",
    ...(restoredImageKey ? { restoredImageKey } : {}),
    ...(colorizedImageKey ? { colorizedImageKey } : {}),
    ...(animationVideoKey ? { animationVideoKey } : {}),
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [isFreeTier, setIsFreeTier] = useState(true);
  const [isAnonymousResult, setIsAnonymousResult] = useState(false);
  const [showAnonymousUpgrade, setShowAnonymousUpgrade] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [needsPolling, setNeedsPolling] = useState(false);
  const [retryAllowed, setRetryAllowed] = useState(false);
  const [streamRevision, setStreamRevision] = useState(0);
  const taskContextRef = useRef<TaskContext>({
    workflow: "full",
    accessMode: "authenticated",
    attemptCount: 1,
    retryAllowed: false,
  });
  const tResult = useTranslations("result");
  const tProcessing = useTranslations("processing");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

  const handleTaskStatus = useCallback(
    (data: Record<string, unknown>) => {
      const context = readTaskContext(data, taskContextRef.current);
      taskContextRef.current = context;
      setRetryAllowed(context.retryAllowed);

      const commonParams = {
        workflow: context.workflow,
        access_mode: context.accessMode,
      };
      const status = typeof data.status === "string" ? data.status : "";
      if (["restoring", "colorizing", "animating"].includes(status)) {
        trackTaskEventOnce("generation_started", taskId, context.attemptCount, {
          ...commonParams,
          status,
        });
      } else if (status === "completed") {
        trackTaskEventOnce("generation_completed", taskId, context.attemptCount, commonParams);
        trackTaskEventOnce("result_view", taskId, context.attemptCount, commonParams);
      } else if (status === "failed") {
        trackTaskEventOnce("generation_failed", taskId, context.attemptCount, {
          ...commonParams,
          failure_code:
            typeof data.failureCode === "string"
              ? data.failureCode
              : "processing_failed",
          ...(typeof data.failureStage === "string"
            ? { stage: data.failureStage }
            : {}),
        });
      } else if (status === "cancelled") {
        trackTaskEventOnce("generation_cancelled", taskId, context.attemptCount, commonParams);
      }
    },
    [taskId]
  );

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
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(tErrors("taskNotFound")))
      )
      .then((data) => {
        handleTaskStatus(data as Record<string, unknown>);
        const accessMode =
          typeof data.accessMode === "string" ? data.accessMode : "";
        setIsAnonymousResult(accessMode === "anonymous");
        if (accessMode === "anonymous") {
          setIsFreeTier(true);
        }

        const completedResult =
          data.status === "completed"
            ? getTaskResult(data as Record<string, unknown>)
            : null;

        if (completedResult) {
          setNeedsPolling(false);
          setResult(completedResult);
          if (accessMode === "anonymous") {
            setShowAnonymousUpgrade(true);
          }
        } else if (data.status === "failed") {
          setNeedsPolling(false);
          setError(resolveTaskErrorMessage(data.errorMessage, tErrors));
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
  }, [handleTaskStatus, taskId, tErrors]);

  const handleComplete = useCallback(
    (data: { status: string; progress: number; [key: string]: unknown }) => {
      handleTaskStatus(data);
      if (data.accessMode === "anonymous") {
        setIsAnonymousResult(true);
        setIsFreeTier(true);
        setShowAnonymousUpgrade(true);
      }
      setResult(getTaskResult(data) ?? null);
      setError(null);
      setNeedsPolling(false);
    },
    [handleTaskStatus],
  );

  const handleError = useCallback(
    (msg: string) => {
      setError(resolveTaskErrorMessage(msg, tErrors));
      setResult(null);
      setNeedsPolling(false);
    },
    [tErrors],
  );

  const handleConnectionLost = useCallback(() => {
    const context = taskContextRef.current;
    trackTaskEventOnce(
      "status_stream_disconnected",
      taskId,
      context.attemptCount,
      {
        workflow: context.workflow,
        access_mode: context.accessMode,
        stage: "status_stream",
      }
    );
  }, [taskId]);

  async function handleRetry() {
    const context = taskContextRef.current;
    trackTaskEventOnce("generation_retry_requested", taskId, context.attemptCount, {
      workflow: context.workflow,
      access_mode: context.accessMode,
    });
    setRetrying(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || tErrors("retryFailed"));
      }
      const nextAttempt = Number(body?.task?.attemptCount);
      const attemptCount = Number.isFinite(nextAttempt)
        ? Math.max(1, Math.floor(nextAttempt))
        : context.attemptCount + 1;
      taskContextRef.current = {
        ...context,
        attemptCount,
        retryAllowed: false,
      };
      trackTaskEventOnce("generation_retry_accepted", taskId, attemptCount, {
        workflow: context.workflow,
        access_mode: context.accessMode,
      });
      setError(null);
      setResult(null);
      setRetryAllowed(false);
      setNeedsPolling(true);
      setStreamRevision((revision) => revision + 1);
    } catch (err) {
      trackTaskEventOnce("generation_retry_failed", taskId, context.attemptCount, {
        workflow: context.workflow,
        access_mode: context.accessMode,
        failure_code: "network_or_server",
      });
      setError(err instanceof Error ? err.message : tErrors("retryFailed"));
    } finally {
      setRetrying(false);
    }
  }

  const showProgress = needsPolling && !result && !error;
  const originalAssetUrl = buildTaskAssetUrl(taskId, "original");
  const imageResultKind = result?.colorizedImageKey
    ? "colorized"
    : result?.restoredImageKey
    ? "restored"
    : null;
  const imageAssetUrl = imageResultKind
    ? buildTaskAssetUrl(taskId, imageResultKind)
    : "";
  const imageDownloadUrl = imageResultKind
    ? buildTaskAssetUrl(taskId, imageResultKind, { download: true })
    : "";
  const animationAssetUrl = result?.animationVideoKey
    ? buildTaskAssetUrl(taskId, "animation")
    : "";
  const animationDownloadUrl = result?.animationVideoKey
    ? buildTaskAssetUrl(taskId, "animation", { download: true })
    : "";

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
              key={`${taskId}:${streamRevision}`}
              taskId={taskId}
              onComplete={handleComplete}
              onError={handleError}
              onStatus={handleTaskStatus}
              onConnectionLost={handleConnectionLost}
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
            {retryAllowed && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 min-h-[44px]"
              >
                {retrying ? tResult("retrying") : tCommon("retry")}
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!initialLoading && result && (
          <div className="space-y-8">
            {isAnonymousResult && showAnonymousUpgrade ? (
              <section className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-5 text-center">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Want HD + unlimited?
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
                  Your no-login preview is ready with a watermark and lower
                  resolution. Sign up to create more animations, save your
                  history, and unlock higher-quality exports.
                </p>
                <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Sign up for HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAnonymousUpgrade(false)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/12 px-6 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05] hover:text-white"
                  >
                    Keep preview
                  </button>
                </div>
              </section>
            ) : null}

            {/* Before / After */}
            {imageResultKind && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:p-6">
                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                  {tResult("beforeAfter")}
                </h2>
                <BeforeAfterCompare
                  beforeUrl={originalAssetUrl}
                  afterUrl={imageAssetUrl}
                />
              </section>
            )}

            {/* Video */}
            {result.animationVideoKey && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:p-6">
                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                  {tResult("animation")}
                </h2>
                <VideoPlayer src={animationAssetUrl} showWatermark={isFreeTier} />
              </section>
            )}

            {/* Download buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {imageResultKind && (
                <a
                  href={imageDownloadUrl}
                  download
                  onClick={() => {
                    const context = taskContextRef.current;
                    trackAnalyticsEvent(
                      "result_download_requested",
                      {
                        workflow: context.workflow,
                        access_mode: context.accessMode,
                        asset_kind: imageResultKind,
                        attempt: context.attemptCount,
                      }
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 min-h-[44px]"
                >
                  <DownloadIcon />
                  {tResult("downloadImage")}
                </a>
              )}
              {result.animationVideoKey && (
                <a
                  href={animationDownloadUrl}
                  download
                  onClick={() => {
                    const context = taskContextRef.current;
                    trackAnalyticsEvent(
                      "result_download_requested",
                      {
                        workflow: context.workflow,
                        access_mode: context.accessMode,
                        asset_kind: "animation",
                        attempt: context.attemptCount,
                      }
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] px-6 py-3 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/10 min-h-[44px]"
                >
                  <DownloadIcon />
                  {tResult("downloadVideo")}
                </a>
              )}
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
