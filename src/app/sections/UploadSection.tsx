"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import UploadZone from "@/components/UploadZone";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { localizePathname, type Locale } from "@/i18n/routing";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getContentSafetyCopy } from "@/lib/content-safety";
import type { TaskWorkflow } from "@/types";
import { classifyTaskCreationResponse } from "@/lib/task-create-client";
import { clearPendingUpload, readPendingUpload, savePendingUpload } from "@/lib/pending-upload";
import { getSingleRunCopy } from "@/lib/single-run-copy";
import { getConversionCopy } from "@/lib/conversion-copy";

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
  const { data: session, status } = useSession();
  const userId = String((session?.user as Record<string, unknown> | undefined)?.id || "");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [savedImageKey, setSavedImageKey] = useState<string | null>(null);
  const [retryImageKey, setRetryImageKey] = useState<string | null>(null);
  const [allowanceConsumed, setAllowanceConsumed] = useState<boolean | null>(false);
  const createInFlightRef = useRef(false);
  const locale = useLocale() as Locale;
  const t = useTranslations("upload");
  const tErrors = useTranslations("errors");
  const contentSafety = getContentSafetyCopy(locale);
  const localizedPathname = localizePathname(locale, pathname);
  const isEmbedded = variant === "embedded";
  const copy = getConversionCopy(locale);
  const downloadCopy = getSingleRunCopy(locale);
  const accountTier = (session?.user as Record<string, unknown> | undefined)?.tier;



  const containerClasses = isEmbedded
    ? "flex h-full w-full flex-col rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-5"
    : "mx-auto w-full max-w-6xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4 shadow-xl backdrop-blur-sm sm:p-10";

  const wrapperClasses = isEmbedded
    ? `w-full ${className}`.trim()
    : `px-3 py-8 sm:px-4 sm:py-14 ${className}`.trim();

  const handleUpload = useCallback(async (imageKey: string) => {
    if (createInFlightRef.current) return;
    // Retain the uploaded source before leaving for authentication.
    if (status !== "authenticated") {
      trackAnalyticsEvent("sign_in_prompted_upload", {
        source: analyticsSource,
      });
      savePendingUpload({ imageKey, workflow, pathname: localizedPathname, userId: "" });
      setSavedImageKey(imageKey);
      createInFlightRef.current = true;
      setIsCreating(true);
      try { await signIn("google", { callbackUrl: `${localizedPathname}?resumeUpload=1#upload-section` }); }
      catch { setError(tErrors("taskCreateFailed")); }
      finally { setIsCreating(false); createInFlightRef.current = false; }
      return;
    }

    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setRetryImageKey(null);
    setQuotaExhausted(false);
    setAllowanceConsumed(false);

    trackAnalyticsEvent("task_create_started", {
      source: analyticsSource,
      workflow,
      auth_state: "authenticated",
    });
    setIsCreating(true);
    setError("");

    let responseAllowance: boolean | null = false;
    try {
      // Account entitlements can change after checkout without a new login session.
      const quotaResponse = await fetch("/api/quota", { cache: "no-store" });
      const latestQuota = await quotaResponse.json().catch(() => null);
      if (!quotaResponse.ok || !["free", "professional", "pay_as_you_go"].includes(latestQuota?.tier)) throw new Error(tErrors("taskCreateFailed"));
      const singleRun = latestQuota.tier !== "professional" && latestQuota.tier !== "pay_as_you_go";
      responseAllowance = singleRun ? false : null;
      const res = await fetch(singleRun ? "/api/photo-orders" : "/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey, workflow, ...(singleRun ? { locale } : {}) }),
      });

      const data = await res.json().catch(() => null);
      responseAllowance =
        typeof data?.allowanceConsumed === "boolean"
          ? data.allowanceConsumed
          : singleRun ? false : null;
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
        setAllowanceConsumed(singleRun ? false : failure.allowanceConsumed);
        setRetryImageKey(failure.retryable ? imageKey : null);
        if (failure.failureCode === "daily_quota_exhausted" || failure.failureCode === "no_credits") {
          setQuotaExhausted(true);
          setSavedImageKey(imageKey);
          savePendingUpload({ imageKey, workflow, pathname: localizedPathname, userId });
          trackAnalyticsEvent("upgrade_offer_viewed", { source: "quota_exhausted", workflow });
        }
        return;
      }

      if (singleRun) {
        if (typeof data?.orderId !== "string" || !data.orderId) throw new Error(tErrors("taskCreateFailed"));
        trackAnalyticsEvent("photo_order_created", { workflow, source: analyticsSource, plan: "single_run" });
        clearPendingUpload(); setSavedImageKey(null);
        router.push(`/pricing?orderId=${encodeURIComponent(data.orderId)}&plan=single_run`);
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
      clearPendingUpload();
      setSavedImageKey(null);
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
  }, [analyticsSource, locale, localizedPathname, router, status, tErrors, userId, workflow]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const pending = readPendingUpload(userId, localizedPathname, workflow);
    setSavedImageKey(pending?.imageKey ?? null);
    const params = new URLSearchParams(window.location.search);
    if (pending && params.get("resumeUpload") === "1") {
      params.delete("resumeUpload");
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
      void handleUpload(pending.imageKey);
    }
  }, [status, userId, localizedPathname, workflow, handleUpload]);

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

      {savedImageKey && !quotaExhausted && (
        <div className="mb-5 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{copy.savedTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{copy.savedBody}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={isCreating} onClick={() => handleUpload(savedImageKey)} className="min-h-[44px] rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{copy.continue}</button>
            <button type="button" disabled={isCreating} onClick={() => { clearPendingUpload(); setSavedImageKey(null); }} className="min-h-[44px] rounded-lg border border-white/15 px-4 py-3 text-sm text-[var(--color-text-secondary)]">{copy.dismiss}</button>
          </div>
        </div>
      )}

      <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">{accountTier === "professional" ? downloadCopy.proBefore : accountTier === "pay_as_you_go" ? downloadCopy.paidBefore : downloadCopy.before}</p>

      <UploadZone
        onUpload={handleUpload}
        disabled={isCreating || status === "loading"}
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

      {quotaExhausted && (
        <div className="mt-5 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{copy.quotaTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{copy.quotaBody}</p>
          <Link href={`/pricing?plan=starter_pack&returnTo=${encodeURIComponent(localizedPathname)}`} onClick={() => trackAnalyticsEvent("upgrade_clicked", { source: "quota_exhausted", workflow, plan: "starter_pack" })} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-5 py-3 text-center text-sm font-semibold text-white sm:w-auto">{copy.buyCredits}</Link>

        </div>
      )}

      {error && !quotaExhausted && (
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
      <div id="upload-section" className={`scroll-mt-24 ${wrapperClasses}`}>
        {content}
      </div>
    );
  }

  return (
    <section id="upload-section" className={`scroll-mt-24 ${wrapperClasses}`}>
      {content}
    </section>
  );
}
