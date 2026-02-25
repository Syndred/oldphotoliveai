"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// ── Types ───────────────────────────────────────────────────────────────────

export interface TaskHistoryItem {
  id: string;
  status: string;
  progress: number;
  createdAt: string;
  completedAt: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
}

export interface TaskHistoryListProps {
  tasks: TaskHistoryItem[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  deleting?: boolean;
}

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { labelKey: string; className: string }> = {
  pending: { labelKey: "status.pending", className: "bg-blue-500/20 text-blue-400" },
  queued: { labelKey: "status.queued", className: "bg-blue-500/20 text-blue-400" },
  restoring: { labelKey: "status.restoring", className: "bg-cyan-500/20 text-cyan-400" },
  colorizing: { labelKey: "status.colorizing", className: "bg-cyan-500/20 text-cyan-400" },
  animating: { labelKey: "status.animating", className: "bg-cyan-500/20 text-cyan-400" },
  completed: { labelKey: "status.completed", className: "bg-green-500/20 text-green-400" },
  failed: { labelKey: "status.failed", className: "bg-red-500/20 text-red-400" },
  cancelled: { labelKey: "status.cancelled", className: "bg-gray-500/20 text-gray-400" },
};

const PROCESSING_STATUSES = new Set(["restoring", "colorizing", "animating"]);

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function TaskHistoryList({
  tasks,
  selectable = false,
  selectedIds = new Set(),
  onToggleSelect,
  onDelete,
  deleting = false,
}: TaskHistoryListProps) {
  const t = useTranslations("history");

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-sm">
        <svg
          className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-secondary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-[var(--color-text-secondary)]">
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const badge = STATUS_BADGE[task.status] ?? {
          labelKey: task.status,
          className: "bg-gray-500/20 text-gray-400",
        };
        const isProcessing = PROCESSING_STATUSES.has(task.status);
        const isSelected = selectedIds.has(task.id);

        return (
          <div
            key={task.id}
            className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
              isSelected
                ? "border-[var(--color-accent,#6366f1)]/50 bg-[var(--color-accent,#6366f1)]/5"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            {/* Checkbox for selection mode */}
            {selectable && (
              <button
                type="button"
                onClick={() => onToggleSelect?.(task.id)}
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                  isSelected
                    ? "border-[var(--color-accent,#6366f1)] bg-[var(--color-accent,#6366f1)] text-white"
                    : "border-white/30 hover:border-white/50"
                }`}
                aria-label={`Select task ${task.id}`}
                disabled={deleting}
              >
                {isSelected && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}

            {/* Clickable area linking to result */}
            <Link
              href={`/result/${task.id}`}
              className="flex flex-1 items-center gap-4"
              onClick={selectable ? (e) => { e.preventDefault(); onToggleSelect?.(task.id); } : undefined}
            >
              {/* Thumbnail */}
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
                {task.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={task.thumbnailUrl}
                    alt="Task thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      className="h-6 w-6 text-[var(--color-text-secondary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {STATUS_BADGE[task.status] ? t(badge.labelKey) : task.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {formatDate(task.createdAt)}
                </p>

                {isProcessing && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}

                {task.status === "failed" && task.errorMessage && (
                  <p className="mt-1 max-w-[200px] truncate text-xs text-red-400 cursor-default" title={task.errorMessage}>
                    {task.errorMessage}
                  </p>
                )}
              </div>

              {/* Chevron */}
              <svg
                className="h-5 w-5 flex-shrink-0 text-[var(--color-text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Delete button (non-selection mode) */}
            {!selectable && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                disabled={deleting}
                className="flex-shrink-0 rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                aria-label={t("delete")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
