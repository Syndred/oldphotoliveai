"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import type { UserTier } from "@/types";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  CREDIT_PACKS,
  SINGLE_RUN,
  isCreditPackPlan,
  type CreditPackPlan,
  PROFESSIONAL_MONTHLY_DISPLAY_PRICE,
} from "@/lib/billing";

import { localizePathname, publicPathname } from "@/i18n/routing";
import { SUPPORT_EMAIL } from "@/lib/site";
import { getSingleRunCopy, singleRunWorkflowLabel } from "@/lib/single-run-copy";
import { getCheckoutCopy } from "@/lib/checkout-copy";
import { checkoutContext, checkoutLocale, pricingCheckoutPath } from "@/lib/checkout-context";

interface PricingPlan {
  id: "free" | CreditPackPlan | "professional";
  nameKey: string;
  badgeKey: string;
  price: string;
  periodKey?: string;
  periodValues?: Record<string, number>;
  priceNoteKey: string;
  descKey: string;
  featureKeys: string[];
  ctaKey: string;
  highlighted: boolean;
  checkoutPlan?: CreditPackPlan | "professional";
  hiddenUnlessCurrent?: boolean;
}

interface PricingCardsProps {
  currentTier?: UserTier | null;
  hasActiveStripeSubscription?: boolean;
}

function parseUserTier(value: unknown): UserTier | null {
  if (
    value === "free" ||
    value === "pay_as_you_go" ||
    value === "professional"
  ) {
    return value;
  }
  return null;
}

const PLANS: PricingPlan[] = [
  {
    id: "starter_pack",
    nameKey: "starterPack",
    badgeKey: "starterPackBadge",
    price: CREDIT_PACKS.starter_pack.displayPrice,
    periodKey: "creditPackPeriod",
    periodValues: { count: CREDIT_PACKS.starter_pack.credits },
    priceNoteKey: "starterPackPriceNote",
    descKey: "starterPackDesc",
    featureKeys: [
      "starterPackFeature1",
      "starterPackFeature2",
      "starterPackFeature3",
      "starterPackFeature4",
    ],
    ctaKey: "buyPack",
    highlighted: false,
    checkoutPlan: "starter_pack",
  },
  {
    id: "family_pack",
    nameKey: "familyPack",
    badgeKey: "familyPackBadge",
    price: CREDIT_PACKS.family_pack.displayPrice,
    periodKey: "creditPackPeriod",
    periodValues: { count: CREDIT_PACKS.family_pack.credits },
    priceNoteKey: "familyPackPriceNote",
    descKey: "familyPackDesc",
    featureKeys: [
      "familyPackFeature1",
      "familyPackFeature2",
      "familyPackFeature3",
      "familyPackFeature4",
    ],
    ctaKey: "buyPack",
    highlighted: true,
    checkoutPlan: "family_pack",
  },
  {
    id: "archive_pack",
    nameKey: "archivePack",
    badgeKey: "archivePackBadge",
    price: CREDIT_PACKS.archive_pack.displayPrice,
    periodKey: "creditPackPeriod",
    periodValues: { count: CREDIT_PACKS.archive_pack.credits },
    priceNoteKey: "archivePackPriceNote",
    descKey: "archivePackDesc",
    featureKeys: [
      "archivePackFeature1",
      "archivePackFeature2",
      "archivePackFeature3",
      "archivePackFeature4",
    ],
    ctaKey: "buyPack",
    highlighted: false,
    checkoutPlan: "archive_pack",
  },
  {
    id: "professional",
    nameKey: "professional",
    badgeKey: "professionalBadge",
    price: PROFESSIONAL_MONTHLY_DISPLAY_PRICE,
    periodKey: "professionalPeriod",
    priceNoteKey: "professionalPriceNote",
    descKey: "professionalDesc",
    featureKeys: [
      "proFeature1",
      "proFeature2",
      "proFeature3",
      "proFeature4",
      "proFeature5",
    ],
    ctaKey: "subscribe",
    highlighted: true,
    checkoutPlan: "professional",
    hiddenUnlessCurrent: true,
  },
];

export default function PricingCards({
  currentTier: currentTierProp,
  hasActiveStripeSubscription = false,
}: PricingCardsProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutReview, setCheckoutReview] = useState(false);
  const { data: session, status } = useSession();
  const locale = checkoutLocale(useLocale());
  const resumed = useRef(false);
  const checkoutInFlight = useRef(false);
  const copy = getCheckoutCopy(locale);
  const runCopy = getSingleRunCopy(locale);
  const [singleState, setSingleState] = useState<"none" | "checking" | "eligible" | "unlocked" | "unavailable" | "expired">("none");
  const [singleWorkflow, setSingleWorkflow] = useState<string | undefined>();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [photoContext, setPhotoContext] = useState<{ orderId?: string; taskId?: string; returnTo?: string }>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedPlan(params.get("plan"));
    setPhotoContext(checkoutContext(params, locale));
  }, [locale]);
  const [orderTaskId, setOrderTaskId] = useState<string | undefined>();
  useEffect(() => {
    if (!photoContext.orderId) { setSingleState("none"); return; }
    const controller = new AbortController();
    setSingleState("checking");
    fetch(`/api/photo-orders/${encodeURIComponent(photoContext.orderId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("unavailable");
        const task = await response.json();
        if (controller.signal.aborted) return;
        setSingleWorkflow(typeof task.workflow === "string" ? task.workflow : undefined);
        setOrderTaskId(typeof task.taskId === "string" ? task.taskId : undefined);
        setSingleState(task.status === "expired" ? "expired" : task.status === "unpaid" ? "eligible" : ["paid", "refund_pending", "refunded", "review_required"].includes(task.status) ? "unlocked" : "unavailable");
      }).catch(() => { if (!controller.signal.aborted) setSingleState("unavailable"); });
    return () => controller.abort();
  }, [photoContext.orderId, status]);
  const t = useTranslations("pricing");
  const tErrors = useTranslations("errors");

  const sessionTier = parseUserTier(
    (session?.user as Record<string, unknown> | undefined)?.tier
  );
  const currentTier = currentTierProp ?? sessionTier;
  const currentPlanId = currentTier ?? "free";
  const professionalIncludesCredits = currentPlanId === "professional";

  useEffect(() => {
    if (status !== "authenticated" || resumed.current) return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (params.get("resume") !== "1" || params.has("cancelled") || params.has("session_id") || !plan || (!isCreditPackPlan(plan) && plan !== "professional" && plan !== "single_run")) return;
    if (plan === "single_run" && singleState !== "eligible") return;
    resumed.current = true;
    // Consume the intent before the request so refresh/back never reopens checkout.
    params.delete("resume");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params}`);
    trackAnalyticsEvent("checkout_resumed", { plan });
    void handleCheckout(plan);
    // Single-result returns also wait for verified task eligibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, singleState]);

  async function handleCheckout(plan: CreditPackPlan | "professional" | "single_run") {
    if (checkoutReview || checkoutInFlight.current) return;
    const context = checkoutContext(new URLSearchParams(window.location.search), locale);
    if (plan === "single_run" && (!context.orderId || singleState !== "eligible")) { setError(runCopy.unavailable); return; }
    if (status !== "authenticated") {
      setLoadingPlan(plan);
      setError(null);
      trackAnalyticsEvent("sign_in_prompted_checkout", { plan });
      try {
        await signIn("google", { callbackUrl: pricingCheckoutPath(locale, context, { plan, resume: "1" }) });
      } catch {
        setError(tErrors("checkoutFailed"));
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    if (plan !== "professional" && plan !== "single_run" && professionalIncludesCredits) {
      setError(tErrors("professionalAlreadyIncludesCredits"));
      return;
    }

    checkoutInFlight.current = true;
    setLoadingPlan(plan);
    setError(null);
    trackAnalyticsEvent("checkout_started", { plan });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, locale, ...context }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "CHECKOUT_REVIEW_REQUIRED") { setCheckoutReview(true); setError(copy.checkoutReview); return; }
        // Show friendly message for unavailable payment feature
        if (res.status === 503) {
          throw new Error(tErrors("paymentUnavailable"));
        }
        throw new Error(data.error ?? tErrors("checkoutFailed"));
      }
      if (data.url) {
        trackAnalyticsEvent("checkout_redirected", { plan });
        window.location.href = data.url;
      }
    } catch (err) {
      trackAnalyticsEvent("checkout_failed", { plan });
      setError(err instanceof Error ? err.message : tErrors("checkoutFailed"));
    } finally {
      setLoadingPlan(null);
      checkoutInFlight.current = false;
    }
  }

  async function handleBillingPortal() {
    setLoadingPlan("manage_subscription");
    setError(null);
    trackAnalyticsEvent("billing_portal_started");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error(tErrors("paymentUnavailable"));
        }
        throw new Error(data.error ?? tErrors("billingPortalFailed"));
      }
      if (data.url) {
        trackAnalyticsEvent("billing_portal_redirected");
        window.location.href = data.url;
      }
    } catch (err) {
      trackAnalyticsEvent("billing_portal_failed");
      setError(
        err instanceof Error ? err.message : tErrors("billingPortalFailed")
      );
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      {photoContext.taskId ? <a href={localizePathname(locale, `/result/${photoContext.taskId}`)} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><span aria-hidden="true">←</span>{copy.backPhoto}</a> : photoContext.returnTo && <div className="mb-8 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{copy.photoContext}</p>
        <a className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm text-[var(--color-text-primary)]" href={photoContext.taskId ? localizePathname(locale, `/result/${photoContext.taskId}`) : `${photoContext.returnTo}?resumeUpload=1#upload-section`}>{copy.backPhoto}</a>
      </div>}
      <section data-testid="plan-single_run" className="mb-8 rounded-2xl border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{runCopy.card}</h2>
            <p className="mt-3 text-3xl font-bold text-[var(--color-text-primary)]">{SINGLE_RUN.displayPrice} <span className="text-sm font-normal">USD</span></p>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{photoContext.orderId ? singleRunWorkflowLabel(locale, singleWorkflow) : runCopy.summary}</p>
          </div>
          {photoContext.orderId && status === "unauthenticated" ? <button type="button" onClick={async () => { try { await signIn("google", { callbackUrl: pricingCheckoutPath(locale, photoContext) }); } catch { setError(tErrors("checkoutFailed")); } }} className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#17130a]">{copy.login}</button> : singleState === "eligible" ? <button type="button" onClick={() => handleCheckout("single_run")} disabled={checkoutReview || loadingPlan !== null || status === "loading"} className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#17130a] disabled:opacity-50">{loadingPlan === "single_run" ? t("redirecting") : runCopy.buy}</button>
            : singleState === "checking" ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">{runCopy.checking}</p>
            : singleState === "unlocked" && orderTaskId ? <a href={localizePathname(locale, `/result/${orderTaskId}`)} className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)]">{runCopy.open}</a>
            : <a href={`${localizePathname(locale, "/")}#upload-section`} className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[#17130a]">{runCopy.upload}</a>}
        </div>
        {(singleState === "unavailable" || singleState === "expired") && <p role="alert" className="mt-4 text-sm leading-6 text-amber-200">{singleState === "expired" ? runCopy.expired : runCopy.unavailable}</p>}
        <p className="mt-5 text-xs leading-6 text-[var(--color-text-secondary)]">{runCopy.terms} <a className="underline" href={publicPathname(locale, "/terms")}>{t("termsLink")}</a></p>
      </section>
      {!photoContext.orderId && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PLANS.filter(
          (p) => !p.hiddenUnlessCurrent || p.id === currentPlanId
        ).map((p) => {
          const isCurrentPlan =
            (p.id === "free" && currentPlanId === "free") ||
            (p.id === "professional" && currentPlanId === "professional");
          const isSelected = p.id === selectedPlan;
          const isHighlighted = p.highlighted || isCurrentPlan || isSelected;
          const checkoutPlan = p.checkoutPlan;
          const periodLabel = p.periodKey
            ? t(p.periodKey, p.periodValues)
            : "";
          const isPaygBlockedForProfessional =
            checkoutPlan !== "professional" && professionalIncludesCredits;

          return (
            <div
              key={p.id}
              data-testid={`plan-${p.id}`}
              className={`relative flex min-h-full flex-col rounded-2xl border p-6 transition-shadow ${isSelected ? "order-first md:order-none" : ""} ${
                isHighlighted
                  ? "border-[var(--color-accent)] bg-gradient-to-b from-[var(--color-accent)]/10 to-transparent shadow-lg shadow-[var(--color-accent)]/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {p.highlighted && !isCurrentPlan && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-3 py-0.5 text-xs font-semibold text-white">
                  {t("recommended")}
                </span>
              )}

              <div className="flex min-h-[32px] items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t(p.nameKey)}
                </h2>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  {t(p.badgeKey)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {t(p.descKey)}
              </p>

              {isSelected && <p className="mt-3 text-xs leading-5 text-[var(--color-accent)]">{copy.selected}{status !== "authenticated" ? ` · ${copy.signInContinue}` : ""}</p>}
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {p.price}
                </span>
                {periodLabel && (
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {periodLabel}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                {t(p.priceNoteKey)}
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {p.featureKeys.map((fk) => (
                  <li
                    key={fk}
                    className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                  >
                    <span className="mt-0.5 text-[var(--color-accent)]">{"\u2713"}</span>
                    {t(fk)}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrentPlan ? (
                  p.id === "professional" && hasActiveStripeSubscription ? (
                    <div className="space-y-3">
                      <span className="block w-full rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-3 text-center text-sm text-[var(--color-text-primary)] min-h-[44px]">
                        <span className="block">{t("currentPlan")}</span>
                      </span>
                      <button
                        onClick={() => handleBillingPortal()}
                        disabled={checkoutReview || loadingPlan !== null}
                        className="w-full rounded-lg bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-50 min-h-[44px]"
                      >
                        {loadingPlan === "manage_subscription"
                          ? t("redirecting")
                          : t("manageSubscription")}
                      </button>
                    </div>
                  ) : (
                    <span className="block w-full rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-3 text-center text-sm text-[var(--color-text-primary)] min-h-[44px]">
                      <span className="block">{t("currentPlan")}</span>
                    </span>
                  )
                ) : isPaygBlockedForProfessional ? (
                  <span className="block w-full rounded-lg border border-white/10 py-3 text-center text-sm text-[var(--color-text-secondary)] min-h-[44px]">
                    {t("includedInProfessional")}
                  </span>
                ) : checkoutPlan ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleCheckout(checkoutPlan)}
                      disabled={checkoutReview || loadingPlan !== null}
                      className={`w-full rounded-lg py-3 text-sm font-medium transition-colors min-h-[44px] ${
                        p.highlighted
                          ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
                          : "bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white hover:opacity-90"
                      } disabled:opacity-50`}
                    >
                      {loadingPlan === checkoutPlan
                        ? t("redirecting")
                        : t(p.ctaKey)}
                    </button>
                  </div>
                ) : (
                  <span className="block w-full rounded-lg border border-white/10 py-3 text-center text-sm text-[var(--color-text-secondary)] min-h-[44px]">
                    {t(p.ctaKey)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>}

      {checkoutReview && <div className="mt-5"><a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">{copy.contactSupport} · {SUPPORT_EMAIL}</a></div>}
      {error && (
        <p className="mt-4 text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
