"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import TaskHistoryList from "@/components/TaskHistoryList";
import type { TaskHistoryItem } from "@/components/TaskHistoryList";

export default function HistoryPage() {
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("history");

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to load history");
        }
        const data = await res.json();
        setTasks(data.tasks ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h1 className="mb-8 text-2xl font-bold text-[var(--color-text-primary)]">
          {t("title")}
        </h1>

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
        {!loading && !error && <TaskHistoryList tasks={tasks} />}
      </main>
    </div>
  );
}
