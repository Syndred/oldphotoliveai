"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale } from "next-intl";
import UploadZone from "@/components/UploadZone";
import { useRouter } from "@/i18n/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface AnonymousUploadSectionProps {
  analyticsSource?: string;
}

export default function AnonymousUploadSection({
  analyticsSource = "no_login_page",
}: AnonymousUploadSectionProps) {
  const router = useRouter();
  const locale = useLocale();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [trialUsed, setTrialUsed] = useState(false);

  async function handleUpload(imageKey: string) {
    trackAnalyticsEvent("anonymous_task_create_started", {
      source: analyticsSource,
    });
    setIsCreating(true);
    setError("");
    setTrialUsed(false);

    try {
      const res = await fetch("/api/anonymous-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.code === "ANONYMOUS_TRIAL_USED") {
          setTrialUsed(true);
        }
        throw new Error(data?.error || "Could not start your free animation.");
      }

      trackAnalyticsEvent("anonymous_task_create_succeeded", {
        source: analyticsSource,
      });
      router.push(`/result/${data.taskId}`);
    } catch (err) {
      trackAnalyticsEvent("anonymous_task_create_failed", {
        source: analyticsSource,
      });
      setError(
        err instanceof Error ? err.message : "Could not start your free animation."
      );
      setIsCreating(false);
    }
  }

  return (
    <div
      id="upload-section"
      className="flex h-full w-full flex-col rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-5"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {["No account needed", "One free preview", "Watermarked 480p"].map(
          (label) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]"
            >
              {label}
            </div>
          )
        )}
      </div>

      <UploadZone
        onUpload={handleUpload}
        disabled={isCreating}
        compact
        className="flex-1"
      />

      <div className="mt-4 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 p-4">
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
          Upload one old photo and get a free AI video preview without creating
          an account. Free previews are lower resolution and include an
          OldPhotoLive AI watermark.
        </p>
      </div>

      {isCreating ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Starting your no-login animation...
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
          {trialUsed ? (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: `/${locale}` })}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Want HD + unlimited? Sign up
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
