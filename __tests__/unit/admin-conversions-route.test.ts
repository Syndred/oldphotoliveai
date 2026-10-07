import { NextRequest } from "next/server";
const mockRead = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ hgetall: mockRead }) }));
import { GET } from "@/app/api/internal/admin/conversions/route";
beforeEach(() => { process.env.ADMIN_API_KEY = "qa-admin"; mockRead.mockReset(); });
afterEach(() => { delete process.env.ADMIN_API_KEY; });
it("requires admin access before reading business statistics", async () => {
  expect((await GET(new NextRequest("http://localhost/api/internal/admin/conversions"))).status).toBe(401);
  expect(mockRead).not.toHaveBeenCalled();
});
it("returns bounded UTC aggregates without customer records", async () => {
  mockRead.mockResolvedValue({ purchases: 2, revenue_minor_usd: 998, generations_completed: 8, paid_generations_completed: 2 });
  const response = await GET(new NextRequest("http://localhost/api/internal/admin/conversions?days=2", { headers: { authorization: "Bearer qa-admin" } }));
  const body = await response.json();
  expect(body.timezone).toBe("UTC");
  expect(body.daily).toHaveLength(2);
  expect(body.daily[0]).toMatchObject({ purchases: 2, revenueMinorUsd: 998, generationsCompleted: 8, paidGenerationsCompleted: 2, hdRemakesCompleted: 0 });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("reports an unavailable backend instead of inventing zero revenue", async () => {
  mockRead.mockRejectedValue(new Error("offline"));
  expect((await GET(new NextRequest("http://localhost/api/internal/admin/conversions?days=1", { headers: { authorization: "Bearer qa-admin" } }))).status).toBe(503);
});
