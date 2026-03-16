"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import UploadZone from "@/components/UploadZone";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getContentSafetyCopy } from "@/lib/content-safety";

export default function UploadSection() {
  const router = useRouter();
  const { status } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const locale = useLocale();
  const t = useTranslations("upload");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const contentSafety = getContentSafetyCopy(locale);

  async function handleUpload(imageKey: string) {
    // If not logged in, redirect to login
    if (status !== "authenticated") {
      trackAnalyticsEvent("sign_in_prompted_upload", {
        source: "upload_section",
      });
      signIn("google");
      return;
    }

    trackAnalyticsEvent("task_create_started", {
      source: "upload_section",
    });
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
        throw new Error(data?.error || tErrors("taskCreateFailed"));
      }

      const { taskId } = await res.json();
      trackAnalyticsEvent("task_create_succeeded", {
        source: "upload_section",
      });
      router.push(`/result/${taskId}`);
    } catch (err) {
      trackAnalyticsEvent("task_create_failed", {
        source: "upload_section",
      });
      setError(
        err instanceof Error ? err.message : tErrors("taskCreateFailed")
      );
      setIsCreating(false);
    }
  }

  return (
    <section
      id="upload-section"
      className="px-3 py-8 sm:px-4 sm:py-14"
    >
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4 shadow-xl backdrop-blur-sm sm:p-10">
        <h2 className="mb-2 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-center text-2xl font-bold text-transparent sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mx-auto mb-6 max-w-2xl text-center text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mb-8">
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
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 min-h-[44px] sm:mt-2 sm:w-auto sm:py-2"
            >
              {tAuth("signInWith")}
            </button>
          </div>
        )}

        <UploadZone onUpload={handleUpload} disabled={isCreating} />

        <div className="mt-4 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/6 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            {contentSafety.uploadTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            {contentSafety.uploadNotice}
          </p>
          <Link
            href="/terms"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.06] hover:text-white"
          >
            {contentSafety.linkLabel}
          </Link>
        </div>

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
