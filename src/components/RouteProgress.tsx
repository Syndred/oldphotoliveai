"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin progress bar at the top of the page during route transitions.
 * Shows when pathname changes (Next.js App Router).
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Brief flash on route change
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <div className="h-full animate-pulse bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)]" />
    </div>
  );
}
