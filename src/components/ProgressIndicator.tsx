"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskStatus } from "@/types";

// ── Types ───────────────────────────────────────────────────────────────────

interface ProgressIndicatorProps {
  taskId: string;
  onComplete?: (task: { status: string; progress: number; [key: string]: unknown }) => void;
  onError?: (error: string) => void;
}

interface StepInfo {
  label: string;
  status: "done" | "active" | "pending";
}

// ── Constants ───────────────────────────────────────────────────────────────

const STEP_LABELS = ["Upload", "Restore", "Colorize", "Animate"] as const;

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

  return STEP_LABELS.map((label, i) => ({
    label,
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
  const eventSourceRef = useRef<EventSource | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

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

  return (
    <div className="w-full" data-testid="progress-indicator">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-4" role="list" aria-label="Processing steps">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none" role="listitem">
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
                className={`text-xs whitespace-nowrap ${
                  step.status === "done"
                    ? "text-[var(--color-text-primary)] font-medium"
                    : step.status === "active"
                    ? "text-[var(--color-accent)] font-medium"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 mt-[-1.25rem]">
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
          "Processing complete"
        ) : (
          `${progress}% — ${status === "pending" || status === "queued" ? "Waiting in queue…" : `${status.charAt(0).toUpperCase() + status.slice(1)}…`}`
        )}
      </p>
    </div>
  );
}

// Export helpers for testing
export { getSteps, getProgress, STEP_LABELS, STATUS_TO_STEP, STATUS_PROGRESS };
export type { ProgressIndicatorProps, StepInfo };
