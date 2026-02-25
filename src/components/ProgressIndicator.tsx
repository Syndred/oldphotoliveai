"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { TaskStatus } from "@/types";
import { buildCdnUrl } from "@/lib/url";

// ── Types ───────────────────────────────────────────────────────────────────

interface ProgressIndicatorProps {
  taskId: string;
  onComplete?: (task: { status: string; progress: number; [key: string]: unknown }) => void;
  onError?: (error: string) => void;
}

interface StepInfo {
  key: string;
  status: "done" | "active" | "pending";
}

interface IntermediateResults {
  restoredImageKey?: string;
  colorizedImageKey?: string;
  animationVideoKey?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const;

const STATUS_TO_STEP: Record<string, number> = {
  pending: 0,
  queued: 0,
  restoring: 1,
  colorizing: 2,
  animating: 3,
  completed: 4,
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 0,
  queued: 5,
  restoring: 25,
  colorizing: 50,
  animating: 75,
  completed: 100,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSteps(status: string): StepInfo[] {
  const activeStep = STATUS_TO_STEP[status] ?? 0;
  const isCompleted = status === "completed";

  return STEP_KEYS.map((key, i) => ({
    key,
    status: isCompleted || i < activeStep ? "done" : i === activeStep && !isCompleted ? "active" : "pending",
  }));
}

function getProgress(status: string, serverProgress?: number): number {
  if (serverProgress !== undefined && serverProgress >= 0) return serverProgress;
  return STATUS_PROGRESS[status] ?? 0;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ProgressIndicator({ taskId, onComplete, onError }: ProgressIndicatorProps) {
  const [status, setStatus] = useState<string>("pending");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [intermediateResults, setIntermediateResults] = useState<IntermediateResults>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const t = useTranslations("processing");

  // Keep callback refs fresh without re-triggering effect
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (!taskId) return;

    const es = new EventSource(`/api/tasks/${taskId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          onErrorRef.current?.(data.error);
          es.close();
          return;
        }

        const taskStatus = data.status as TaskStatus;
        setStatus(taskStatus);
        setProgress(getProgress(taskStatus, data.progress));

        // Extract intermediate results
        setIntermediateResults(prev => ({
          ...prev,
          ...(data.restoredImageKey ? { restoredImageKey: data.restoredImageKey } : {}),
          ...(data.colorizedImageKey ? { colorizedImageKey: data.colorizedImageKey } : {}),
          ...(data.animationVideoKey ? { animationVideoKey: data.animationVideoKey } : {}),
        }));

        if (taskStatus === "completed") {
          onCompleteRef.current?.(data);
          es.close();
        } else if (taskStatus === "failed") {
          const msg = data.errorMessage || "Processing failed";
          setError(msg);
          onErrorRef.current?.(msg);
          es.close();
        }
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      setError("Connection lost");
      onErrorRef.current?.("Connection lost");
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [taskId]);

  const steps = getSteps(status);

  // Collect visible previews for the large preview area below progress bar.
  // A preview is shown when its step is "done" (activeStep past that index) and the key exists.
  const activeStep = STATUS_TO_STEP[status] ?? 0;
  const isCompleted = status === "completed";
  const previews: { key: string; type: "image" | "video"; src: string; label: string; testId: string }[] = [];
  if (intermediateResults.restoredImageKey && (isCompleted || activeStep > 1)) {
    previews.push({ key: "restored", type: "image", src: buildCdnUrl(intermediateResults.restoredImageKey), label: t("previewRestored"), testId: "preview-restored" });
  }
  if (intermediateResults.colorizedImageKey && (isCompleted || activeStep > 2)) {
    previews.push({ key: "colorized", type: "image", src: buildCdnUrl(intermediateResults.colorizedImageKey), label: t("previewColorized"), testId: "preview-colorized" });
  }
  if (intermediateResults.animationVideoKey && isCompleted) {
    previews.push({ key: "animation", type: "video", src: buildCdnUrl(intermediateResults.animationVideoKey), label: t("previewAnimation"), testId: "preview-animation" });
  }

  return (
    <div className="w-full" data-testid="progress-indicator">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-4" role="list" aria-label="Processing steps">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1 last:flex-none" role="listitem">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium
                  transition-all duration-300
                  ${step.status === "done"
                    ? "bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white"
                    : step.status === "active"
                    ? "border-2 border-[var(--color-accent)] text-[var(--color-accent)] animate-pulse"
                    : "border-2 border-white/20 text-[var(--color-text-secondary)]"
                  }
                `}
                aria-current={step.status === "active" ? "step" : undefined}
              >
                {step.status === "done" ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs text-center leading-tight ${
                  step.status === "done"
                    ? "text-[var(--color-text-primary)] font-medium"
                    : step.status === "active"
                    ? "text-[var(--color-accent)] font-medium"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {t(step.key)}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2">
                <div
                  className={`h-0.5 w-full transition-colors duration-300 ${
                    steps[i + 1].status === "done" || steps[i + 1].status === "active"
                      ? "bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)]"
                      : "bg-white/10"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Processing progress: ${progress}%`}
        />
      </div>

      {/* Status text */}
      <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : status === "completed" ? (
          t("completed")
        ) : (
          `${progress}% — ${status === "pending" || status === "queued" ? t("pending") : `${status.charAt(0).toUpperCase() + status.slice(1)}…`}`
        )}
      </p>

      {/* Large preview area below progress */}
      {previews.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="preview-gallery">
          {previews.map((p) => (
            <div
              key={p.key}
              className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-2"
            >
              {p.type === "image" ? (
                <img
                  data-testid={p.testId}
                  src={p.src}
                  alt={p.label}
                  className="w-full rounded-lg object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <video
                  data-testid={p.testId}
                  src={p.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-lg"
                  aria-label={p.label}
                />
              )}
              <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">{p.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export helpers for testing
export { getSteps, getProgress, STEP_KEYS, STATUS_TO_STEP, STATUS_PROGRESS };
export type { ProgressIndicatorProps, StepInfo, IntermediateResults };
