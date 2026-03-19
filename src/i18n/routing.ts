import { defineRouting } from "next-intl/routing";

export const locales = ["en", "zh", "es", "ja"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  alternateLinks: true,
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
  return `/${locale}${normalizedPathname}`;
}
