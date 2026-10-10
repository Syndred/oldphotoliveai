"use client";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDownloadCopy } from "@/lib/download-copy";
import { getSingleRunCopy } from "@/lib/single-run-copy";
import type { QuotaInfo } from "@/types";
export default function ResultDownload({ unlocked }: {
  taskId: string; quota: QuotaInfo | null; unlocked: boolean; workflow: string; onUnlocked: () => void | Promise<void>;
}) {
  const locale = useLocale();
  const copy = getDownloadCopy(locale);
  const runCopy = getSingleRunCopy(locale);
  return <section className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-5 sm:p-6" aria-labelledby="download-offer-title">
    <h2 id="download-offer-title" className="text-xl font-semibold text-[var(--color-text-primary)]">{unlocked ? copy.unlocked : runCopy.card}</h2>
    <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{unlocked ? copy.unlockedBody : runCopy.legacy}</p>
    {!unlocked && <Link href="/#upload-section" className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white sm:w-auto">{runCopy.upload}</Link>}
  </section>;
}
