import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFoundPage() {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-primary-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-xl backdrop-blur-sm">
        {/* 404 */}
        <p className="mb-2 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-6xl font-bold text-transparent">
          404
        </p>

        <h2 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
          {t("pageNotFound")}
        </h2>

        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
          {t("pageNotFoundDesc")}
        </p>

        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
