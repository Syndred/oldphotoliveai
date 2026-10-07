import { isValidLocale, localizePathname, stripLocaleFromPathname, type Locale } from "@/i18n/routing";

const TOOL_PATHS = new Set(["/", "/restore-old-photos", "/animate", "/to-video", "/bring-to-life", "/restore", "/animate-free", "/colorize-old-photos", "/repair-damaged-old-photos", "/no-login"]);
export function checkoutLocale(value: unknown): Locale {
  return typeof value === "string" && isValidLocale(value) ? value : "en";
}
export function safeCheckoutTaskId(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : undefined;
}
export function safeCheckoutReturnTo(value: unknown, locale: Locale): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\?#%]/.test(value)) return undefined;
  const path = stripLocaleFromPathname(value);
  return TOOL_PATHS.has(path) ? localizePathname(locale, path) : undefined;
}
export function checkoutContext(params: URLSearchParams, locale: Locale) {
  return { taskId: safeCheckoutTaskId(params.get("taskId")), returnTo: safeCheckoutReturnTo(params.get("returnTo"), locale) };
}
export function pricingCheckoutPath(locale: Locale, context: { taskId?: string; returnTo?: string }, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (context.taskId) params.set("taskId", context.taskId);
  if (context.returnTo) params.set("returnTo", context.returnTo);
  return `${localizePathname(locale, "/pricing")}${params.size ? `?${params}` : ""}`;
}
