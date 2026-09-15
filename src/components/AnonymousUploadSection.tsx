"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale } from "next-intl";
import UploadZone from "@/components/UploadZone";
import { useRouter } from "@/i18n/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { classifyTaskCreationResponse } from "@/lib/task-create-client";

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
  const [retryImageKey, setRetryImageKey] = useState<string | null>(null);
  const [allowanceConsumed, setAllowanceConsumed] = useState<boolean | null>(false);
  const createInFlightRef = useRef(false);

  async function handleUpload(imageKey: string) {
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    trackAnalyticsEvent("anonymous_task_create_started", {
      source: analyticsSource,
      workflow: "animate",
      auth_state: "anonymous",
    });
    setIsCreating(true);
    setError("");
    setTrialUsed(false);
    setRetryImageKey(null);
    setAllowanceConsumed(false);

    let responseAllowance: boolean | null = null;
    try {
      const res = await fetch("/api/anonymous-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey }),
      });
      const data = await res.json().catch(() => null);
      responseAllowance =
        typeof data?.allowanceConsumed === "boolean"
          ? data.allowanceConsumed
          : null;

      if (!res.ok) {
        const failure = classifyTaskCreationResponse(res.status, data);
        if (data?.code === "ANONYMOUS_TRIAL_USED") {
          setTrialUsed(true);
        }
        trackAnalyticsEvent(
          failure.kind === "rejected"
            ? "anonymous_task_create_rejected"
            : "anonymous_task_create_failed",
          {
            source: analyticsSource,
            workflow: "animate",
            stage: failure.stage,
            failure_code: failure.failureCode,
            allowance_consumed: failure.allowanceConsumed,
          }
        );
        setError(data?.error || "Could not start your free animation.");
        setAllowanceConsumed(failure.allowanceConsumed);
        setRetryImageKey(failure.retryable ? imageKey : null);
        return;
      }

      if (typeof data?.taskId !== "string" || !data.taskId) {
        throw new Error("Could not start your free animation.");
      }
      trackAnalyticsEvent("anonymous_task_create_succeeded", {
        source: analyticsSource,
        workflow: "animate",
        replayed: data?.replayed === true,
        allowance_consumed: data?.allowanceConsumed === true,
      });
      router.push(`/result/${data.taskId}`);
    } catch (err) {
      trackAnalyticsEvent("anonymous_task_create_failed", {
        source: analyticsSource,
        workflow: "animate",
        stage: "creation",
        failure_code: "network_or_server",
        ...(typeof responseAllowance === "boolean"
          ? { allowance_consumed: responseAllowance }
          : {}),
      });
      setError(
        err instanceof Error ? err.message : "Could not start your free animation."
      );
      setRetryImageKey(imageKey);
      setAllowanceConsumed(responseAllowance);
    } finally {
      createInFlightRef.current = false;
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
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {allowanceConsumed === false
              ? "Your no-login preview was not used. You can retry the same uploaded photo."
              : "The request may have used your preview. Retry the same uploaded photo first; an existing result will reopen without another charge."}
          </p>
          {retryImageKey ? (
            <button
              type="button"
              onClick={() => handleUpload(retryImageKey)}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-accent)]"
            >
              Retry same photo
            </button>
          ) : null}
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
