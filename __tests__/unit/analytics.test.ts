/** @jest-environment jsdom */

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST",
    NEXT_PUBLIC_CLARITY_PROJECT_ID: "clarity-test",
  };
  sessionStorage.clear();
  localStorage.clear();
  window.gtag = jest.fn();
  window.clarity = jest.fn();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("privacy-safe analytics", () => {
  it("normalizes private result routes and drops query strings", async () => {
    const { normalizeAnalyticsPath } = await import("@/lib/analytics");
    expect(normalizeAnalyticsPath("/zh/result/private-task-123?token=secret")).toBe(
      "/zh/result/:taskId"
    );
    expect(normalizeAnalyticsPath("/colorize-old-photos?email=a@example.com")).toBe(
      "/colorize-old-photos"
    );
  });

  it("sends only bounded allowlisted parameters", async () => {
    const { trackAnalyticsEvent } = await import("@/lib/analytics");
    trackAnalyticsEvent("task_create_failed", {
      source: "home_hero",
      stage: "creation",
      failure_code: "internal_error",
      raw_error: "secret token",
      image_key: "private/photo.jpg",
    });
    expect(window.gtag).toHaveBeenCalledWith("event", "task_create_failed", {
      source: "home_hero",
      stage: "creation",
      failure_code: "internal_error",
    });
  });

  it("deduplicates a task state locally without sending the task id", async () => {
    const { trackTaskEventOnce } = await import("@/lib/analytics");
    trackTaskEventOnce("generation_completed", "private-task-123", 2, {
      workflow: "animate",
      access_mode: "anonymous",
    });
    trackTaskEventOnce("generation_completed", "private-task-123", 2, {
      workflow: "animate",
      access_mode: "anonymous",
    });
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith("event", "generation_completed", {
      workflow: "animate",
      access_mode: "anonymous",
      attempt: 2,
    });
    expect(JSON.stringify((window.gtag as jest.Mock).mock.calls)).not.toContain(
      "private-task-123"
    );
  });

  it("rejects event names that exceed the GA4 custom-event limit", async () => {
    const { trackAnalyticsEvent } = await import("@/lib/analytics");
    trackAnalyticsEvent(`event_${"x".repeat(40)}`, { status: "failed" });
    expect(window.gtag).not.toHaveBeenCalled();
  });
});
