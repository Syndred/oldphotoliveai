// API-side i18n helpers
// Requirements: 18.5
// Provides locale detection and translated error messages for API routes.

import { locales, defaultLocale, LOCALE_COOKIE } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import enMessages from "../../messages/en.json";
import zhMessages from "../../messages/zh.json";
import esMessages from "../../messages/es.json";
import jaMessages from "../../messages/ja.json";

// ── Message maps ────────────────────────────────────────────────────────────

const messages: Record<Locale, Record<string, Record<string, string>>> = {
  en: enMessages as unknown as Record<string, Record<string, string>>,
  zh: zhMessages as unknown as Record<string, Record<string, string>>,
  es: esMessages as unknown as Record<string, Record<string, string>>,
  ja: jaMessages as unknown as Record<string, Record<string, string>>,
};

// ── Locale detection ────────────────────────────────────────────────────────

function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

function parseCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [key, value] = pair.trim().split("=");
    if (key === LOCALE_COOKIE && value) return value;
  }
  return null;
}

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const segments = header.split(",");
  for (const segment of segments) {
    const lang = segment.split(";")[0].trim().toLowerCase();
    if (isValidLocale(lang)) return lang;
    const prefix = lang.split("-")[0];
    if (isValidLocale(prefix)) return prefix;
  }
  return null;
}

/**
 * Detect locale from a Request object (Cookie > Accept-Language > default).
 * Works with the standard Request/NextRequest in API routes.
 */
export function getRequestLocale(request: Request): Locale {
  // 1. Cookie
  const cookieHeader = request.headers.get("Cookie");
  const cookieLocale = parseCookieHeader(cookieHeader);
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;

  // 2. Accept-Language
  const acceptLang = request.headers.get("Accept-Language");
  const headerLocale = parseAcceptLanguage(acceptLang);
  if (headerLocale) return headerLocale;

  // 3. Default
  return defaultLocale;
}

// ── Error message lookup ────────────────────────────────────────────────────

/**
 * Get a translated error message by key and locale.
 * Supports parameter interpolation: `{reason}` in the message template
 * will be replaced with `params.reason`.
 *
 * Falls back to the key itself if the translation is missing.
 */
export function getErrorMessage(
  key: string,
  locale: Locale,
  params?: Record<string, string>
): string {
  const errorMessages = messages[locale]?.errors;
  let message = errorMessages?.[key] ?? key;

  if (params) {
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(`{${param}}`, value);
    }
  }

  return message;
}
