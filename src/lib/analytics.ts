import { locales } from "@/i18n/routing";

const ANALYTICS_PARAM_KEYS = new Set([
  "source",
  "stage",
  "failure_code",
  "workflow",
  "auth_state",
  "access_mode",
  "asset_kind",
  "status",
  "plan",
  "release_version",
  "attempt",
  "replayed",
  "allowance_consumed",
  "bytes_saved",
]);
const ENUM_VALUE = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const EVENT_NAME = /^[a-z][a-z0-9_]{0,39}$/;
const RESULT_ROUTE_PATTERN = new RegExp(
  `^/(?:(${locales.join("|")})/)?result/[^/]+/?$`
);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "config" | "event" | "js",
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void;
    clarity?: {
      (command: "consent"): void;
      (command: "event", value: string): void;
      (command: "set", key: string, value: string | string[]): void;
      q?: unknown[];
    };
  }
}

export function getGaMeasurementId(): string {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
}

export function getClarityProjectId(): string {
  return process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "";
}

export function isAnalyticsEnabled(): boolean {
  return getGaMeasurementId().length > 0;
}

export function isClarityEnabled(): boolean {
  return getClarityProjectId().length > 0;
}

export function normalizeAnalyticsPath(rawPath: string): string {
  const path = rawPath.split(/[?#]/, 1)[0] || "/";
  const resultRoute = path.match(RESULT_ROUTE_PATTERN);
  if (!resultRoute) return path;

  const localePrefix = resultRoute[1] ? `/${resultRoute[1]}` : "";
  return `${localePrefix}/result/:taskId`;
}

export function sanitizeAnalyticsParams(
  params: Record<string, unknown>
): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ANALYTICS_PARAM_KEYS.has(key)) continue;
    if (typeof value === "boolean") {
      safe[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = Math.max(0, Math.min(Math.round(value), 1_000_000_000));
    } else if (typeof value === "string" && ENUM_VALUE.test(value)) {
      safe[key] = value;
    }
  }
  return safe;
}

export function trackAnalyticsEvent(
  eventName: string,
  params: Record<string, unknown> = {}
): boolean {
  if (typeof window === "undefined" || !EVENT_NAME.test(eventName)) return false;
  const safeParams = sanitizeAnalyticsParams(params);
  let sentToGa = false;

  if (isAnalyticsEnabled() && typeof window.gtag === "function") {
    try {
      window.gtag("event", eventName, safeParams);
      sentToGa = true;
    } catch {
      // Analytics must never interrupt the product. Leave the once marker
      // unset so a later state render can retry after GA becomes available.
    }
  }

  if (isClarityEnabled() && typeof window.clarity === "function") {
    window.clarity("event", eventName);
  }

  return sentToGa;
}

export function trackTaskEventOnce(
  eventName: string,
  taskId: string,
  attempt: number,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined" || !taskId) return;
  const key = `opla:analytics:${eventName}:${taskId}:${attempt}`;
  try {
    if (window.localStorage.getItem(key)) return;
  } catch {
    // Storage can be unavailable in strict browser modes. Continue without
    // deduplication rather than breaking the product.
  }

  const sentToGa = trackAnalyticsEvent(eventName, { ...params, attempt });
  if (!sentToGa) return;

  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // The event was delivered; failure to persist the marker is non-fatal.
  }
}
