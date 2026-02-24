"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { locales, LOCALE_COOKIE, type Locale } from "@/i18n/routing";
import { reloadPage } from "@/lib/browser";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
};

export default function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(locale: Locale) {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${365 * 24 * 60 * 60}`;
    reloadPage();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-white/20 px-2 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/40 hover:text-white min-h-[44px]"
        aria-label="Switch language"
        aria-expanded={open}
      >
        {LOCALE_LABELS[currentLocale]}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 min-w-[80px] rounded-md border border-white/10 bg-[var(--color-primary-bg)] py-1 shadow-lg">
          {locales
            .filter((l) => l !== currentLocale)
            .map((locale) => (
              <button
                key={locale}
                onClick={() => switchLocale(locale)}
                className="block w-full px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-white/10 hover:text-white"
              >
                {LOCALE_LABELS[locale]}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
