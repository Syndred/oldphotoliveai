"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import UploadZone from "@/components/UploadZone";

export default function UploadSection() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("upload");

  async function handleUpload(imageKey: string) {
    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to create task (${res.status})`);
      }

      const { taskId } = await res.json();
      router.push(`/result/${taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCreating(false);
    }
  }

  return (
    <section id="upload-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-6 shadow-xl backdrop-blur-sm sm:p-10">
        <h2 className="mb-2 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-center text-3xl font-bold text-transparent sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mb-8 text-center text-sm text-[var(--color-text-secondary)]">
          {t("subtitle")}
        </p>

        <UploadZone onUpload={handleUpload} disabled={isCreating} />

        {isCreating && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("creatingTask")}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
