"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCheckoutCopy } from "@/lib/checkout-copy";
import { SUPPORT_EMAIL } from "@/lib/site";
import { getDownloadCopy } from "@/lib/download-copy";
import { trackAnalyticsEvent, trackTaskEventOnce } from "@/lib/analytics";
import type { QuotaInfo } from "@/types";

export default function ResultDownload({ taskId, quota, unlocked, workflow, onUnlocked }: {
  taskId: string; quota: QuotaInfo | null; unlocked: boolean; workflow: string; onUnlocked: () => void | Promise<void>;
}) {
  const locale = useLocale();
  const copy = getDownloadCopy(locale);
  const checkoutCopy = getCheckoutCopy(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsPayment, setNeedsPayment] = useState(false);
  const [checkoutReview, setCheckoutReview] = useState(false);
  const inFlight = useRef(false);
  const hasAllowance = !needsPayment && (quota?.tier === "professional" || (quota?.tier === "pay_as_you_go" && quota.credits > 0));
  useEffect(() => {
    if (!unlocked) trackTaskEventOnce("download_offer_viewed", taskId, 1, { workflow, source: "result" });
  }, [taskId, unlocked, workflow]);
  async function unlock() {
    if (inFlight.current || checkoutReview) return;
    inFlight.current = true; setBusy(true); setError("");
    trackAnalyticsEvent("download_unlock_requested", { workflow, source: "credits" });
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/unlock`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (body?.code === "CHECKOUT_REVIEW_REQUIRED") { setCheckoutReview(true); setError(checkoutCopy.checkoutReview); return; }
        if (response.status === 401 || body?.code === "NO_CREDITS" || body?.code === "CREDITS_EXPIRED" || body?.code === "PAYMENT_REQUIRED") { setNeedsPayment(true); return; }
        throw new Error(copy.failed);
      }
      if (body?.unlocked !== true) throw new Error(copy.failed);
      await onUnlocked();
      trackAnalyticsEvent("download_unlocked", { workflow, source: "credits" });
    } catch { setError(copy.failed); }
    finally { setBusy(false); inFlight.current = false; }
  }
  return <section className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-5 sm:p-6" aria-labelledby="download-offer-title">
    <h2 id="download-offer-title" className="text-xl font-semibold text-[var(--color-text-primary)]">{unlocked ? copy.unlocked : copy.title}</h2>
    <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{unlocked ? copy.unlockedBody : workflow === "restore" || workflow === "colorize" ? copy.imageBody : copy.body}</p>
    {!unlocked && <div className="mt-5 space-y-3">
      {checkoutReview ? <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[48px] items-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)]">{checkoutCopy.contactSupport} · {SUPPORT_EMAIL}</a> : hasAllowance ? <button type="button" disabled={busy} onClick={unlock} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? copy.busy : quota?.tier === "professional" ? copy.pro : copy.credit}</button>
        : <Link href={`/pricing?taskId=${encodeURIComponent(taskId)}&plan=single_photo`} onClick={() => trackAnalyticsEvent("download_unlock_clicked", { workflow, plan: "single_photo" })} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white sm:w-auto">{copy.buy}</Link>}
      <p className="text-xs leading-5 text-[var(--color-text-secondary)]">{copy.terms}</p>
    </div>}
    {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-300">{error}</p>}
  </section>;
}
