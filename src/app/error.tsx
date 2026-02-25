"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-primary-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-xl backdrop-blur-sm">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <svg
            className="h-7 w-7 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
          {t("somethingWentWrong")}
        </h2>

        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
          {t("unexpectedError")}
        </p>

        <button
          onClick={reset}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("tryAgain")}
        </button>
      </div>
    </div>
  );
}
