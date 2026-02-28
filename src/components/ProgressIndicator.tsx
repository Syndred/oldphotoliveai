"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { TaskStatus } from "@/types";
import { buildCdnUrl } from "@/lib/url";
import { resolveTaskErrorMessage } from "@/lib/task-error";

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

export default function ProgressIndicator({ taskId, onComplete, onError }: ProgressIndicatorProps) {
  const [status, setStatus] = useState<string>("pending");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [intermediateResults, setIntermediateResults] = useState<IntermediateResults>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const t = useTranslations("processing");
  const tErrors = useTranslations("errors");
  const tStatus = useTranslations("history.status");
  const resolveTaskErrorRef = useRef<(msg: string | null | undefined) => string>(
    (msg) => resolveTaskErrorMessage(msg, tErrors)
  );
  const connectionLostRef = useRef<string>(t("connectionLost"));

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    resolveTaskErrorRef.current = (msg) => resolveTaskErrorMessage(msg, tErrors);
    connectionLostRef.current = t("connectionLost");
  }, [t, tErrors]);

  useEffect(() => {
    if (!taskId) return;

    const es = new EventSource(`/api/tasks/${taskId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          const msg = resolveTaskErrorRef.current(String(data.error));
          setError(msg);
          onErrorRef.current?.(msg);
          es.close();
          return;
        }

        const taskStatus = data.status as TaskStatus;
        setStatus(taskStatus);
        setProgress(getProgress(taskStatus, data.progress));

        setIntermediateResults((prev) => ({
          ...prev,
          ...(data.restoredImageKey ? { restoredImageKey: data.restoredImageKey } : {}),
          ...(data.colorizedImageKey ? { colorizedImageKey: data.colorizedImageKey } : {}),
          ...(data.animationVideoKey ? { animationVideoKey: data.animationVideoKey } : {}),
        }));

        if (taskStatus === "completed") {
          onCompleteRef.current?.(data);
          es.close();
        } else if (taskStatus === "failed") {
          const msg = resolveTaskErrorRef.current(
            typeof data.errorMessage === "string" ? data.errorMessage : null
          );
          setError(msg);
          onErrorRef.current?.(msg);
          es.close();
        }
      } catch {
        // ignore malformed event payload
      }
    };

    es.onerror = () => {
      const msg = connectionLostRef.current;
      setError(msg);
      onErrorRef.current?.(msg);
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [taskId]);

  const steps = getSteps(status);
  const activeStep = STATUS_TO_STEP[status] ?? 0;
  const isCompleted = status === "completed";

  const processingStatuses = new Set(["restoring", "colorizing", "animating"]);
  const statusLabel =
    status === "pending" || status === "queued"
      ? t("pending")
      : processingStatuses.has(status)
      ? `${tStatus(status)}...`
      : status;

  const previews: { key: string; type: "image" | "video"; src: string; label: string; testId: string }[] = [];
  if (intermediateResults.restoredImageKey && (isCompleted || activeStep > 1)) {
    previews.push({
      key: "restored",
      type: "image",
      src: buildCdnUrl(intermediateResults.restoredImageKey),
      label: t("previewRestored"),
      testId: "preview-restored",
    });
  }
  if (intermediateResults.colorizedImageKey && (isCompleted || activeStep > 2)) {
    previews.push({
      key: "colorized",
      type: "image",
      src: buildCdnUrl(intermediateResults.colorizedImageKey),
      label: t("previewColorized"),
      testId: "preview-colorized",
    });
  }
  if (intermediateResults.animationVideoKey && isCompleted) {
    previews.push({
      key: "animation",
      type: "video",
      src: buildCdnUrl(intermediateResults.animationVideoKey),
      label: t("previewAnimation"),
      testId: "preview-animation",
    });
  }

  return (
    <div className="w-full" data-testid="progress-indicator">
      <div className="mb-4 flex items-center justify-between" role="list" aria-label="Processing steps">
        {steps.map((step, i) => (
          <div key={step.key} className="flex flex-1 items-center last:flex-none" role="listitem">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium
                  transition-all duration-300
                  ${
                    step.status === "done"
                      ? "bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white"
                      : step.status === "active"
                      ? "animate-pulse border-2 border-[var(--color-accent)] text-[var(--color-accent)]"
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
                className={`text-center text-[10px] leading-tight sm:text-xs ${
                  step.status === "done"
                    ? "font-medium text-[var(--color-text-primary)]"
                    : step.status === "active"
                    ? "font-medium text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {t(step.key)}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className="mx-2 flex-1">
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

      <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : status === "completed" ? (
          t("completed")
        ) : (
          `${progress}% - ${statusLabel}`
        )}
      </p>

      {previews.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="preview-gallery">
          {previews.map((p) => (
            <div
              key={p.key}
              className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-2"
            >
              {p.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  data-testid={p.testId}
                  src={p.src}
                  alt={p.label}
                  className="w-full rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
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

export { getSteps, getProgress, STEP_KEYS, STATUS_TO_STEP, STATUS_PROGRESS };
export type { ProgressIndicatorProps, StepInfo, IntermediateResults };
