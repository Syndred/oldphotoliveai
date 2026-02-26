"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import UploadZone from "@/components/UploadZone";

export default function UploadSection() {
  const router = useRouter();
  const { status } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("upload");
  const tAuth = useTranslations("auth");

  async function handleUpload(imageKey: string) {
    // If not logged in, redirect to login
    if (status !== "authenticated") {
      signIn("google");
      return;
    }

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

        {/* Login prompt for unauthenticated users */}
        {status !== "authenticated" && status !== "loading" && (
          <div className="mb-4 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {tAuth("signInPrompt")}
            </p>
            <button
              type="button"
              onClick={() => signIn("google")}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 min-h-[44px]"
            >
              {tAuth("signInWith")}
            </button>
          </div>
        )}

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
