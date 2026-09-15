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
const MAX_PENDING_TASK_EVENTS = 100;

interface PendingTaskEvent {
  eventName: string;
  params: Record<string, string | number | boolean>;
}

const pendingTaskEvents = new Map<string, PendingTaskEvent>();
const deliveredTaskEvents = new Set<string>();
let gaReadyListenerAttached = false;

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

function sendGaEvent(
  eventName: string,
  params: Record<string, string | number | boolean>
): boolean {
  if (!isAnalyticsEnabled() || typeof window.gtag !== "function") return false;

  try {
    window.gtag("event", eventName, params);
    return true;
  } catch {
    return false;
  }
}

function hasTaskEventMarker(key: string): boolean {
  if (deliveredTaskEvents.has(key)) return true;
  try {
    return Boolean(window.localStorage.getItem(key));
  } catch {
    return false;
  }
}

function rememberDeliveredTaskEvent(key: string): void {
  deliveredTaskEvents.add(key);
  if (deliveredTaskEvents.size > MAX_PENDING_TASK_EVENTS) {
    const oldest = deliveredTaskEvents.values().next().value as string | undefined;
    if (oldest) deliveredTaskEvents.delete(oldest);
  }

  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // In-memory deduplication still protects this page lifecycle.
  }
}

function ensureGaReadyListener(): void {
  if (gaReadyListenerAttached || typeof window === "undefined") return;
  window.addEventListener("opla-ga-ready", flushPendingTaskEvents);
  gaReadyListenerAttached = true;
}

function enqueueTaskEvent(key: string, event: PendingTaskEvent): void {
  if (!pendingTaskEvents.has(key) && pendingTaskEvents.size >= MAX_PENDING_TASK_EVENTS) {
    const oldest = pendingTaskEvents.keys().next().value as string | undefined;
    if (oldest) pendingTaskEvents.delete(oldest);
  }
  pendingTaskEvents.set(key, event);
  ensureGaReadyListener();
}

function flushPendingTaskEvents(): void {
  if (typeof window === "undefined") return;
  window.removeEventListener("opla-ga-ready", flushPendingTaskEvents);
  gaReadyListenerAttached = false;

  for (const [key, event] of Array.from(pendingTaskEvents.entries())) {
    if (hasTaskEventMarker(key)) {
      pendingTaskEvents.delete(key);
      continue;
    }
    if (!sendGaEvent(event.eventName, event.params)) continue;

    rememberDeliveredTaskEvent(key);
    pendingTaskEvents.delete(key);
  }

  if (pendingTaskEvents.size > 0) ensureGaReadyListener();
}

export function trackAnalyticsEvent(
  eventName: string,
  params: Record<string, unknown> = {}
): boolean {
  if (typeof window === "undefined" || !EVENT_NAME.test(eventName)) return false;
  const safeParams = sanitizeAnalyticsParams(params);
  const sentToGa = sendGaEvent(eventName, safeParams);

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
  if (!EVENT_NAME.test(eventName) || hasTaskEventMarker(key)) return;

  const eventParams = sanitizeAnalyticsParams({ ...params, attempt });
  const sentToGa = trackAnalyticsEvent(eventName, eventParams);
  if (!sentToGa) {
    enqueueTaskEvent(key, { eventName, params: eventParams });
    return;
  }

  pendingTaskEvents.delete(key);
  rememberDeliveredTaskEvent(key);
}
