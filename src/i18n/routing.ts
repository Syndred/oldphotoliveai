import type { UrlObject } from "url";
import { defineRouting } from "next-intl/routing";

export const locales = ["en", "zh", "es", "ja"] as const;
export const publicLocales = ["en", "zh"] as const;
export type PublicLocale = (typeof publicLocales)[number];
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
  alternateLinks: false,
  localeCookie: {
    name: LOCALE_COOKIE,
  },
});

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getPathLocale(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return segment && isValidLocale(segment) ? segment : null;
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = getPathLocale(pathname);

  if (!locale) {
    return pathname || "/";
  }

  const strippedPathname = pathname.slice(locale.length + 1);
  return strippedPathname ? strippedPathname : "/";
}

export function localizePathname(locale: Locale, pathname = "/"): string {
  const basePathname = stripLocaleFromPathname(pathname);
  const normalizedPathname =
    basePathname === "/" ? "" : `/${basePathname.replace(/^\/+/, "")}`;
  return locale === defaultLocale ? normalizedPathname || "/" : `/${locale}${normalizedPathname}`;
}

// Only these Chinese public pages have maintained, indexable translations.
export const CHINESE_PUBLIC_PATHS = new Set([
  "/",
  "/pricing",
  "/colorize-old-photos",
]);

export function isApplicationPath(pathname: string): boolean {
  const basePath = stripLocaleFromPathname(pathname);
  return /^\/(result|history|login|admin)(?:\/|$)/.test(basePath);
}

export function hasChinesePublicPage(pathname: string): boolean {
  const basePath = stripLocaleFromPathname(pathname).replace(/\/$/, "") || "/";
  return CHINESE_PUBLIC_PATHS.has(basePath);
}

// Navigation points straight to a maintained page, never through a migration.
export function publicPathname(locale: Locale, pathname = "/"): string {
  const path = stripLocaleFromPathname(pathname).replace(/\/$/, "") || "/";
  const basePath = ({ "/colorize": "/colorize-old-photos", "/restore": "/restore-old-photos", "/animate-old-photos": "/animate" } as Record<string, string>)[path] ?? path;
  if (isApplicationPath(basePath)) return localizePathname(locale === "zh" ? "zh" : "en", basePath);
  return localizePathname(locale === "zh" && hasChinesePublicPage(basePath) ? "zh" : "en", basePath);
}

// Choosing Chinese from an English-only article/tool opens the Chinese home.
export function languageSwitchPathname(locale: PublicLocale, pathname = "/"): string {
  const basePath = stripLocaleFromPathname(pathname);
  return localizePathname(locale, locale === "zh" && !isApplicationPath(basePath) && !hasChinesePublicPage(basePath) ? "/" : basePath);
}

export function publicNavigationHref(locale: Locale, href: string | UrlObject): string | UrlObject {
  if (typeof href === "string") {
    if (!href.startsWith("/") || href.startsWith("//")) return href;
    const boundary = href.search(/[?#]/);
    const path = boundary < 0 ? href : href.slice(0, boundary);
    const suffix = boundary < 0 ? "" : href.slice(boundary);
    return `${publicPathname(locale, path)}${suffix}`;
  }
  if (href.protocol || href.host || href.hostname || !href.pathname?.startsWith("/") || href.pathname.startsWith("//")) return href;
  return { ...href, pathname: publicPathname(locale, href.pathname) };
}
