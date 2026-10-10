"use client";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { checkoutLocale, safeCheckoutReturnTo, safeCheckoutTaskId } from "@/lib/checkout-context";
import { localizePathname } from "@/i18n/routing";
import { getCheckoutCopy } from "@/lib/checkout-copy";
import { getDownloadCopy } from "@/lib/download-copy";
import { getSingleRunCopy } from "@/lib/single-run-copy";
import { SUPPORT_EMAIL } from "@/lib/site";
import { trackVerifiedPurchase } from "@/lib/analytics";

type Receipt = { status: string; transactionId: string; plan: string; amountTotal: number; currency: string; creditsAdded: number; fulfillmentKind?: string; taskId?: string; returnTo?: string };
export default function CheckoutReturn({ onConfirmed }: { onConfirmed?: () => void }) {
  const locale = checkoutLocale(useLocale());
  const copy = getCheckoutCopy(locale);
  const runCopy = getSingleRunCopy(locale);
  const downloadCopy = getDownloadCopy(locale);
  const { status } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [state, setState] = useState("checking");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id"));
    setCancelled(params.get("cancelled") === "true");
  }, []);
  useEffect(() => {
    if (!sessionId || status !== "authenticated") return;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const check = async () => {
      try {
        const response = await fetch(`/api/stripe/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("verification failed");
        const data: Receipt = await response.json();
        if (controller.signal.aborted) return;
        if (data.status === "fulfilled") {
          setReceipt(data);
          setState("fulfilled");
          if (typeof data.amountTotal === "number" && typeof data.currency === "string") trackVerifiedPurchase(data);
          onConfirmed?.();
        } else if (data.status === "refund_required") {
          setReceipt(null);
          setState("refund_required");
        } else {
          setState(data.status === "processing" ? "processing" : "pending");
          if (++attempts < 15) timeout = setTimeout(check, 2000);
        }
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    };
    setState("checking");
    void check();
    return () => { controller.abort(); clearTimeout(timeout); };
    // onConfirmed is an optional UI refresh callback, not a polling dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, status, retry]);
  if (!sessionId && !cancelled) return null;
  const taskId = safeCheckoutTaskId(receipt?.taskId);
  const returnTo = safeCheckoutReturnTo(receipt?.returnTo, locale);
  const single = receipt?.plan === "single_photo";
  const singleRun = receipt?.plan === "single_run" || receipt?.fulfillmentKind === "photo_processing";
  const href = singleRun && taskId ? localizePathname(locale, `/result/${taskId}`) : taskId ? `${localizePathname(locale, `/result/${taskId}`)}?${single ? "unlocked=1" : "upgrade=1"}` : returnTo ? `${returnTo}?resumeUpload=1#upload-section` : `${localizePathname(locale, "/")}#upload-section`;
  return <div data-testid="checkout-return" className="mt-8 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-5 sm:p-6" role="status" aria-live="polite">
    {!sessionId ? <p className="text-sm leading-7 text-[var(--color-text-secondary)]">{copy.cancelled}</p> : status !== "authenticated" ? <button onClick={() => signIn("google", { callbackUrl: window.location.pathname + window.location.search })} className="rounded-xl bg-[var(--color-accent)] px-5 py-3 font-semibold text-white">{copy.login}</button> : <>
      <p className="font-semibold text-[var(--color-text-primary)]">{state === "fulfilled" ? singleRun ? runCopy.processing : single ? downloadCopy.complete : receipt?.plan === "professional" ? copy.proDone : copy.done : state === "pending" ? copy.pending : state === "processing" ? copy.processing : state === "refund_required" ? copy.deliveryIssue : state === "error" ? copy.error : copy.checking}</p>
      {state === "refund_required" && <div className="mt-4"><a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">{copy.contactSupport} · {SUPPORT_EMAIL}</a></div>}
      {state === "fulfilled" && receipt && <>
        {receipt.creditsAdded > 0 && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{copy.added}: {receipt.creditsAdded}</p>}
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{singleRun ? runCopy.processingBody : single ? downloadCopy.same : copy.noCharge}</p>
        <a className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 py-3 font-semibold text-white" href={href}>{singleRun ? runCopy.open : single ? downloadCopy.return : taskId ? copy.continuePhoto : returnTo ? copy.continueUpload : copy.start}</a>
      </>}
      {state !== "fulfilled" && state !== "checking" && <button className="mt-4 rounded-xl border border-white/20 px-4 py-2 text-sm text-[var(--color-text-primary)]" onClick={() => setRetry(v => v + 1)}>{copy.retry}</button>}
    </>}
  </div>;
}
