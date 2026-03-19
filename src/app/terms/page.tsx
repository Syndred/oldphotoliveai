import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import { Link } from "@/i18n/navigation";
import { getContentSafetyCopy } from "@/lib/content-safety";
import { SUPPORT_EMAIL } from "@/lib/site";

const LAST_UPDATED = "March 16, 2026";

const SECTION_KEYS = [
  "eligibility",
  "serviceDescription",
  "accounts",
  "acceptableUse",
  "contentPermissions",
  "aiOutputs",
  "payments",
  "termination",
  "changes",
  "disclaimers",
  "liability",
] as const;

export default async function TermsOfServicePage() {
  const locale = await getLocale();
  const t = await getTranslations("legal.terms");
  const tShared = await getTranslations("legal.shared");
  const contentSafety = getContentSafetyCopy(locale);

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_68%)]" />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
          <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="border-b border-white/10 px-5 py-8 sm:px-8 sm:py-10">
              <span className="inline-flex items-center rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
                {t("eyebrow")}
              </span>
              <h1 className="mt-4 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {t("description")}
              </p>
              <div className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-[var(--color-text-secondary)] sm:text-sm">
                {tShared("lastUpdated")}: {LAST_UPDATED}
              </div>
            </div>

            <div className="space-y-4 px-5 py-6 sm:px-8 sm:py-8">
              <section className="rounded-2xl border border-white/8 bg-black/10 p-5 text-sm leading-7 text-[var(--color-text-secondary)] sm:p-6 sm:text-base">
                {t("intro")}
              </section>

              {SECTION_KEYS.map((key) => (
                <div key={key} className="space-y-4">
                  <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
                      {t(`sections.${key}.title`)}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                      {t(`sections.${key}.body`)}
                    </p>
                  </section>

                  {key === "acceptableUse" ? (
                    <section className="rounded-2xl border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/8 p-5 sm:p-6">
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
                        {contentSafety.termsTitle}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                        {contentSafety.termsBody}
                      </p>
                    </section>
                  ) : null}
                </div>
              ))}

              <section className="rounded-2xl border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/8 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
                  {t("contactTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {t("contactBody")}
                </p>
                <a
                  className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-[var(--color-accent)]/30 bg-black/15 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/50 hover:bg-black/25"
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  {SUPPORT_EMAIL}
                </a>
              </section>

              <div className="flex justify-start border-t border-white/10 pt-2">
                <Link
                  href="/privacy"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.06] hover:text-white"
                >
                  {t("relatedLink")}
                </Link>
              </div>
            </div>
          </article>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
