"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const t = useTranslations("nav");

  if (status === "loading") {
    return (
      <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="rounded-md bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 min-h-[44px]"
      >
        {t("login")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {session.user?.image && (
        <Image
          src={session.user.image}
          alt={session.user.name ?? "User avatar"}
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <span className="hidden text-sm text-[var(--color-text-secondary)] sm:inline">
        {session.user?.name}
      </span>
      <button
        onClick={() => signOut()}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/40 hover:text-white min-h-[44px]"
      >
        {t("logout")}
      </button>
    </div>
  );
}
