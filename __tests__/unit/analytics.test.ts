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
  it.each([
    ["/en/result/private-task-123?token=secret#preview", "/en/result/:taskId"],
    ["/zh/result/private-task-123?token=secret#preview", "/zh/result/:taskId"],
    ["/result/private-task-123?token=secret#preview", "/result/:taskId"],
  ])("normalizes private result route %s", async (rawPath, expected) => {
    const { normalizeAnalyticsPath } = await import("@/lib/analytics");
    expect(normalizeAnalyticsPath(rawPath)).toBe(expected);
    expect(normalizeAnalyticsPath(rawPath)).not.toContain("private-task-123");
    expect(normalizeAnalyticsPath(rawPath)).not.toMatch(/[?#]/);
  });

  it("drops query strings from public routes", async () => {
    const { normalizeAnalyticsPath } = await import("@/lib/analytics");
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

  it("does not consume the once marker until GA accepts the event", async () => {
    const { trackTaskEventOnce } = await import("@/lib/analytics");
    window.gtag = undefined;

    trackTaskEventOnce("generation_completed", "private-task-123", 2, {
      workflow: "animate",
    });

    expect(
      localStorage.getItem(
        "opla:analytics:generation_completed:private-task-123:2"
      )
    ).toBeNull();

    window.gtag = jest.fn();
    trackTaskEventOnce("generation_completed", "private-task-123", 2, {
      workflow: "animate",
    });
    trackTaskEventOnce("generation_completed", "private-task-123", 2, {
      workflow: "animate",
    });

    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(
      localStorage.getItem(
        "opla:analytics:generation_completed:private-task-123:2"
      )
    ).toBe("1");
  });

  it("rejects event names that exceed the GA4 custom-event limit", async () => {
    const { trackAnalyticsEvent } = await import("@/lib/analytics");
    trackAnalyticsEvent(`event_${"x".repeat(40)}`, { status: "failed" });
    expect(window.gtag).not.toHaveBeenCalled();
  });
});
