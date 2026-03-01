"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import TaskHistoryList from "@/components/TaskHistoryList";
import type { TaskHistoryItem } from "@/components/TaskHistoryList";

export default function HistoryPage() {
  const { status } = useSession();
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectable, setSelectable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("history");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchHistory() {
      try {
        const CACHE_KEY = "history_cache";
        const CACHE_TTL = 30_000;
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL) {
              setTasks(data);
              setLoading(false);
              return;
            }
          } catch {
            // ignore corrupt cache
          }
        }

        const res = await fetch("/api/history");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? tErrors("historyLoadFailed"));
        }
        const data = await res.json();
        const taskList = data.tasks ?? [];
        setTasks(taskList);

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: taskList, ts: Date.now() })
          );
        } catch {
          // quota exceeded, ignore
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : tErrors("historyLoadFailed")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [status, tErrors]);

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
      setSelectedIds(new Set(tasks.map((task) => task.id)));
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
          const updated = prev.filter((task) => !deletedSet.has(task.id));
          try {
            sessionStorage.setItem(
              "history_cache",
              JSON.stringify({ data: updated, ts: Date.now() })
            );
          } catch {
            // ignore cache write errors
          }
          return updated;
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          taskIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setDeleting(false);
    }
  }, []);

  const handleDeleteSingle = useCallback(
    (id: string) => {
      handleDeleteTasks([id]);
    },
    [handleDeleteTasks]
  );

  const handleDeleteSelected = useCallback(() => {
    handleDeleteTasks(Array.from(selectedIds));
  }, [handleDeleteTasks, selectedIds]);

  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[var(--color-primary-bg)]">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-sm">
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
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <p className="mb-4 text-[var(--color-text-secondary)]">
              {tAuth("signInPrompt")}
            </p>
            <button
              type="button"
              onClick={() => signIn("google")}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              {tAuth("signInWith")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <section aria-labelledby="history-heading">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1
              id="history-heading"
              className="text-2xl font-bold text-[var(--color-text-primary)]"
            >
              {t("title")}
            </h1>

            {!loading && !error && tasks.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                {selectable ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="min-h-[40px] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/10"
                    >
                      {allSelected ? t("deselectAll") : t("selectAll")}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.size === 0 || deleting}
                      className="min-h-[40px] rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                    >
                      {deleting ? t("deleting") : t("deleteSelected")} (
                      {selectedIds.size})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectable(false);
                        setSelectedIds(new Set());
                      }}
                      className="min-h-[40px] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/10"
                    >
                      X
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectable(true)}
                    className="min-h-[40px] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/10"
                  >
                    {t("deleteSelected")}
                  </button>
                )}
              </div>
            )}
          </div>

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

          {error && !loading && (
            <div
              className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center"
              role="alert"
            >
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="relative">
              {deleting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 shadow-lg">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {t("deleting")}
                    </span>
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
        </section>
      </main>
    </div>
  );
}
