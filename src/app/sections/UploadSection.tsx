"use client";

import { useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import UploadZone from "@/components/UploadZone";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { localizePathname, type Locale } from "@/i18n/routing";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getContentSafetyCopy } from "@/lib/content-safety";
import type { TaskWorkflow } from "@/types";
import { classifyTaskCreationResponse } from "@/lib/task-create-client";

interface UploadSectionProps {
  title?: string;
  subtitle?: string;
  analyticsSource?: string;
  variant?: "default" | "embedded";
  showHeader?: boolean;
  className?: string;
  workflow?: TaskWorkflow;
}

export default function UploadSection({
  title,
  subtitle,
  analyticsSource = "upload_section",
  variant = "default",
  showHeader = true,
  className = "",
  workflow = "full",
}: UploadSectionProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [retryImageKey, setRetryImageKey] = useState<string | null>(null);
  const [allowanceConsumed, setAllowanceConsumed] = useState<boolean | null>(false);
  const createInFlightRef = useRef(false);
  const locale = useLocale() as Locale;
  const t = useTranslations("upload");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const contentSafety = getContentSafetyCopy(locale);
  const localizedPathname = localizePathname(locale, pathname);
  const isEmbedded = variant === "embedded";

  const containerClasses = isEmbedded
    ? "flex h-full w-full flex-col rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-5"
    : "mx-auto w-full max-w-6xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4 shadow-xl backdrop-blur-sm sm:p-10";

  const wrapperClasses = isEmbedded
    ? `w-full ${className}`.trim()
    : `px-3 py-8 sm:px-4 sm:py-14 ${className}`.trim();

  async function handleUpload(imageKey: string) {
    // If not logged in, redirect to login
    if (status !== "authenticated") {
      trackAnalyticsEvent("sign_in_prompted_upload", {
        source: analyticsSource,
      });
      signIn("google", { callbackUrl: localizedPathname });
      return;
    }

    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setRetryImageKey(null);
    setAllowanceConsumed(false);

    trackAnalyticsEvent("task_create_started", {
      source: analyticsSource,
      workflow,
      auth_state: "authenticated",
    });
    setIsCreating(true);
    setError("");

    let responseAllowance: boolean | null = null;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey, workflow }),
      });

      const data = await res.json().catch(() => null);
      responseAllowance =
        typeof data?.allowanceConsumed === "boolean"
          ? data.allowanceConsumed
          : null;
      if (!res.ok) {
        const failure = classifyTaskCreationResponse(res.status, data);
        trackAnalyticsEvent(
          failure.kind === "rejected" ? "task_create_rejected" : "task_create_failed",
          {
            source: analyticsSource,
            workflow,
            stage: failure.stage,
            failure_code: failure.failureCode,
            allowance_consumed: failure.allowanceConsumed,
          }
        );
        setError(data?.error || tErrors("taskCreateFailed"));
        setAllowanceConsumed(failure.allowanceConsumed);
        setRetryImageKey(failure.retryable ? imageKey : null);
        return;
      }

      const taskId = typeof data?.taskId === "string" ? data.taskId : "";
      if (!taskId) throw new Error(tErrors("taskCreateFailed"));
      trackAnalyticsEvent("task_create_succeeded", {
        source: analyticsSource,
        workflow,
        replayed: data?.replayed === true,
        allowance_consumed: data?.allowanceConsumed === true,
      });
      router.push(`/result/${taskId}`);
    } catch (err) {
      trackAnalyticsEvent("task_create_failed", {
        source: analyticsSource,
        workflow,
        stage: "creation",
        failure_code: "network_or_server",
        ...(typeof responseAllowance === "boolean"
          ? { allowance_consumed: responseAllowance }
          : {}),
      });
      setError(
        err instanceof Error ? err.message : tErrors("taskCreateFailed")
      );
      setRetryImageKey(imageKey);
      setAllowanceConsumed(responseAllowance);
    } finally {
      createInFlightRef.current = false;
      setIsCreating(false);
    }
  }

  const content = (
    <div className={containerClasses}>
      {showHeader ? (
        <>
          <h2 className="mb-2 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-center text-2xl font-bold text-transparent sm:text-4xl">
            {title ?? t("title")}
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-center text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mb-8">
            {subtitle ?? t("subtitle")}
          </p>
        </>
      ) : null}

      {/* Login prompt for unauthenticated users */}
      {status !== "authenticated" && status !== "loading" && (
        <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 p-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            {tAuth("signInPrompt")}
          </p>
          <button
            type="button"
            onClick={() =>
              signIn("google", { callbackUrl: localizedPathname })
            }
            className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto sm:py-2"
          >
            {tAuth("signInWith")}
          </button>
        </div>
      )}

      <UploadZone
        onUpload={handleUpload}
        disabled={isCreating}
        compact={isEmbedded}
        className={isEmbedded ? "flex-1" : ""}
      />

      <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4 text-left">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {contentSafety.uploadTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {contentSafety.uploadNotice}
            </p>
          </div>
          <Link
            href="/terms"
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.06] hover:text-white"
          >
            {contentSafety.linkLabel}
          </Link>
        </div>
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
        <div className="mt-4 text-center" role="alert">
          <p className="text-sm text-red-400">{error}</p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            {allowanceConsumed === false
              ? tErrors("creationAllowanceNotUsed")
              : tErrors("creationAllowanceMayBeUsed")}
          </p>
          {retryImageKey ? (
            <button
              type="button"
              onClick={() => handleUpload(retryImageKey)}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-accent)]"
            >
              {tErrors("retrySamePhoto")}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return (
      <div id="upload-section" className={wrapperClasses}>
        {content}
      </div>
    );
  }

  return (
    <section id="upload-section" className={wrapperClasses}>
      {content}
    </section>
  );
}
