"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import {
  LOCALE_COOKIE,
  locales,
  localizePathname,
  type Locale,
} from "@/i18n/routing";
import { navigateTo } from "@/lib/browser";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "\u7b80\u4f53\u4e2d\u6587",
  es: "Espa\u00f1ol",
  ja: "\u65e5\u672c\u8a9e",
};

export default function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function switchLocale(locale: Locale) {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }

    setOpen(false);

    const queryString = new URLSearchParams(
      Array.from(searchParams.entries())
    ).toString();
    const targetPath = localizePathname(locale, pathname);
    const targetUrl = queryString ? `${targetPath}?${queryString}` : targetPath;

    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    navigateTo(targetUrl);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/20 bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-text-secondary)] backdrop-blur-sm transition-colors hover:border-[var(--color-accent)]/40 hover:text-white"
        aria-label="Open language menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{LOCALE_LABELS[currentLocale]}</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path
            d="M5.5 7.5L10 12l4.5-4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Language options"
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-bg)]/95 p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.38)] backdrop-blur-md"
        >
          {locales.map((locale) => {
            const isCurrent = locale === currentLocale;

            return (
              <button
                key={locale}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={() => switchLocale(locale)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isCurrent
                    ? "bg-[var(--color-accent)]/12 text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-white/8 hover:text-white"
                }`}
              >
                <span>{LOCALE_LABELS[locale]}</span>
                {isCurrent && (
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
