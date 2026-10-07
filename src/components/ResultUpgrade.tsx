"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { trackAnalyticsEvent, trackTaskEventOnce } from "@/lib/analytics";
import { getConversionCopy } from "@/lib/conversion-copy";
import type { QuotaInfo } from "@/types";

export default function ResultUpgrade({ taskId, quota, workflow, existingUpgradeTaskId }: {
  taskId: string;
  quota: QuotaInfo | null;
  workflow: string;
  existingUpgradeTaskId?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const copy = getConversionCopy(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsPayment, setNeedsPayment] = useState(false);
  const inFlight = useRef(false);
  const hasCredits = !needsPayment && (quota?.tier === "professional" || (quota?.tier === "pay_as_you_go" && quota.credits > 0));
  const pricingPath = `/pricing?taskId=${encodeURIComponent(taskId)}&plan=starter_pack`;

  useEffect(() => {
    trackTaskEventOnce("upgrade_offer_viewed", taskId, 1, { source: "result", workflow });
  }, [taskId, workflow]);

  async function createHD() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    trackAnalyticsEvent("hd_generation_requested", { source: "result", workflow });
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/upgrade`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || body?.code === "PAYMENT_REQUIRED" || body?.code === "NO_CREDITS") {
          setNeedsPayment(true);
          return;
        }
        throw new Error(response.status === 404 || response.status === 400 ? copy.notAvailable : copy.failed);
      }
      if (typeof body?.taskId !== "string" || !/^[a-zA-Z0-9-]+$/.test(body.taskId)) throw new Error(copy.failed);
      trackAnalyticsEvent("hd_generation_accepted", { workflow, replayed: body.replayed === true });
      router.push(`/result/${body.taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.failed);
      trackAnalyticsEvent("hd_generation_failed", { workflow, failure_code: "network_or_server" });
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <section aria-labelledby="hd-upgrade-title" className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-5 sm:p-6">
      <h2 id="hd-upgrade-title" className="text-xl font-semibold text-[var(--color-text-primary)]">{copy.title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{copy.description}</p>
      <div className="mt-5 flex flex-col items-start gap-3">
        {existingUpgradeTaskId ? (
          <Link href={`/result/${existingUpgradeTaskId}`} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-5 py-3 text-center text-sm font-semibold text-white sm:w-auto">{copy.open}</Link>
        ) : hasCredits ? (
          <button type="button" onClick={createHD} disabled={busy} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-5 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto">
            {busy ? copy.creating : quota?.tier === "professional" ? copy.professionalCreate : copy.create}
          </button>
        ) : (
          <Link href={pricingPath} onClick={() => trackAnalyticsEvent("upgrade_clicked", { source: "result", workflow, plan: "starter_pack" })} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-5 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto">{copy.buy}</Link>
        )}
        {!hasCredits && !existingUpgradeTaskId && <p className="text-xs leading-5 text-[var(--color-text-secondary)]">{copy.terms}</p>}
        <p className="text-xs leading-5 text-[var(--color-text-secondary)]">{copy.keep}</p>
      </div>
      {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-300">{error}</p>}
    </section>
  );
}
