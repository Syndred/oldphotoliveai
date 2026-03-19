const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "";

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
  return GA_MEASUREMENT_ID;
}

export function getClarityProjectId(): string {
  return CLARITY_PROJECT_ID;
}

export function isAnalyticsEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}

export function isClarityEnabled(): boolean {
  return CLARITY_PROJECT_ID.length > 0;
}

export function trackAnalyticsEvent(
  eventName: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;

  if (isAnalyticsEnabled() && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }

  if (isClarityEnabled() && typeof window.clarity === "function") {
    window.clarity("event", eventName);
  }
}
