"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import TaskHistoryList from "@/components/TaskHistoryList";
import type { TaskHistoryItem } from "@/components/TaskHistoryList";

export default function HistoryPage() {
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectable, setSelectable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("history");

  useEffect(() => {
    async function fetchHistory() {
      try {
        // Client-side cache: avoid re-fetching within 30 seconds
        const CACHE_KEY = "history_cache";
        const CACHE_TTL = 30_000; // 30s
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL) {
              setTasks(data);
              setLoading(false);
              return;
            }
          } catch { /* ignore corrupt cache */ }
        }

        const res = await fetch("/api/history");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to load history");
        }
        const data = await res.json();
        const taskList = data.tasks ?? [];
        setTasks(taskList);

        // Cache the result
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: taskList, ts: Date.now() }));
        } catch { /* quota exceeded — ignore */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  }, [tasks, selectedIds.size]);

  const handleDeleteTasks = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      if (res.ok) {
        const deletedSet = new Set(taskIds);
        setTasks((prev) => {
          const updated = prev.filter((t) => !deletedSet.has(t.id));
          // Update cache after delete
          try {
            sessionStorage.setItem("history_cache", JSON.stringify({ data: updated, ts: Date.now() }));
          } catch { /* ignore */ }
          return updated;
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          taskIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setDeleting(false);
    }
  }, []);

  const handleDeleteSingle = useCallback((id: string) => {
    handleDeleteTasks([id]);
  }, [handleDeleteTasks]);

  const handleDeleteSelected = useCallback(() => {
    handleDeleteTasks(Array.from(selectedIds));
  }, [handleDeleteTasks, selectedIds]);

  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {t("title")}
          </h1>

          {/* Toolbar — only show when there are tasks */}
          {!loading && !error && tasks.length > 0 && (
            <div className="flex items-center gap-2">
              {selectable ? (
                <>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/10"
                  >
                    {allSelected ? t("deselectAll") : t("selectAll")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0 || deleting}
                    className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {deleting ? t("deleting") : t("deleteSelected")} ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectable(false); setSelectedIds(new Set()); }}
                    className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/10"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectable(true)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/10"
                >
                  {t("deleteSelected")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3" data-testid="loading-skeleton">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-20 rounded bg-white/10" />
                  <div className="h-3 w-32 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center"
            role="alert"
          >
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Task list */}
        {!loading && !error && (
          <div className="relative">
            {deleting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-primary-bg)] px-4 py-3 shadow-lg border border-white/10">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                  <span className="text-sm text-[var(--color-text-primary)]">{t("deleting")}</span>
                </div>
              </div>
            )}
            <TaskHistoryList
              tasks={tasks}
              selectable={selectable}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onDelete={handleDeleteSingle}
              deleting={deleting}
            />
          </div>
        )}
      </main>
    </div>
  );
}
