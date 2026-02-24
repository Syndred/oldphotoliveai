"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const t = useTranslations("nav");
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => { setSigningIn(true); signIn("google"); }}
        disabled={signingIn}
        className="rounded-md bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 min-h-[44px]"
      >
        {signingIn ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </span>
        ) : t("login")}
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
        onClick={() => { setSigningOut(true); signOut(); }}
        disabled={signingOut}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/40 hover:text-white disabled:opacity-60 min-h-[44px]"
      >
        {signingOut ? (
          <span className="h-4 w-4 inline-block animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : t("logout")}
      </button>
    </div>
  );
}
