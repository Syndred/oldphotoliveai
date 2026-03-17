import { getRateLimitBucket } from "@/lib/rateLimitBucket";

describe("getRateLimitBucket", () => {
  it("separates history reads and deletes", () => {
    expect(getRateLimitBucket("/api/history", "GET")).toBe("history:read");
    expect(getRateLimitBucket("/api/history", "DELETE")).toBe("history:delete");
  });

  it("assigns Stripe endpoints to dedicated buckets", () => {
    expect(getRateLimitBucket("/api/stripe/portal", "POST")).toBe(
      "stripe:portal"
    );
    expect(getRateLimitBucket("/api/stripe/checkout", "POST")).toBe(
      "stripe:checkout"
    );
    expect(getRateLimitBucket("/api/stripe/subscription", "GET")).toBe(
      "stripe:subscription"
    );
  });

  it("normalizes task sub-routes into stable buckets", () => {
    expect(getRateLimitBucket("/api/tasks", "POST")).toBe("tasks:create");
    expect(getRateLimitBucket("/api/tasks/task-1/stream", "GET")).toBe(
      "tasks:stream"
    );
    expect(getRateLimitBucket("/api/tasks/task-1/status", "GET")).toBe(
      "tasks:status"
    );
    expect(getRateLimitBucket("/api/tasks/task-1/cancel", "POST")).toBe(
      "tasks:cancel"
    );
  });
});
