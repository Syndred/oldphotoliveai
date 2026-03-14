"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

const FOOTER_LINKS = [
  { href: "/", key: "home" as const },
  { href: "/pricing", key: "pricing" as const },
  { href: "/history", key: "history" as const },
  { href: "/privacy", key: "privacy" as const },
  { href: "/terms", key: "terms" as const },
] as const;

export default function FooterSection() {
  const t = useTranslations("landing.footer");

  return (
    <footer className="border-t border-[var(--color-border)] px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-lg font-bold text-transparent">
            OldPhotoLive AI
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {t("description")}
          </p>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t(`links.${link.key}`)}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">
        {t("copyright")}
      </p>
    </footer>
  );
}
