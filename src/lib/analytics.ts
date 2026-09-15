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
  return path.replace(/^(\/(?:zh|ja|es))?\/result\/[^/]+\/?$/, (_match, locale = "") =>
    `${locale}/result/:taskId`
  );
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
): void {
  if (typeof window === "undefined" || !EVENT_NAME.test(eventName)) return;
  const safeParams = sanitizeAnalyticsParams(params);

  if (isAnalyticsEnabled() && typeof window.gtag === "function") {
    window.gtag("event", eventName, safeParams);
  }

  if (isClarityEnabled() && typeof window.clarity === "function") {
    window.clarity("event", eventName);
  }
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
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage can be unavailable in strict browser modes; emitting is preferable
    // to breaking the product. GA still receives no task identifier.
  }
  trackAnalyticsEvent(eventName, { ...params, attempt });
}
