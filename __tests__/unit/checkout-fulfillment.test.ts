import type Stripe from "stripe";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockEval = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval }) }));
import { fulfillPaidCheckout } from "@/lib/checkout-fulfillment";

const session = (overrides: Partial<Stripe.Checkout.Session> = {}) => ({
  id: "cs_test_paid", payment_status: "paid", amount_total: 499, currency: "usd",
  metadata: { userId: "user-1", plan: "starter_pack", product: "oldphotoliveai", locale: "zh", taskId: "photo-1" },
  ...overrides,
} as Stripe.Checkout.Session);
let redis: RedisLuaFixture;
beforeEach(() => {
  redis = new RedisLuaFixture();
  redis.setString("user:user-1", JSON.stringify({ id: "user-1", tier: "free", email: "private@example.com" }));
  redis.setString("quota:user-1", JSON.stringify({ userId: "user-1", tier: "free", remaining: 0, credits: 2, creditsExpireAt: "2099-01-01T00:00:00.000Z" }));
  redis.setMembers("quota:daily:users", ["user-1", "user-2"]);
  mockEval.mockReset().mockImplementation((script, keys, args) => redis.eval(script, keys, args));
});
it("grants credits and durable receipt once when completed/async events race and replay", async () => {
  const outcomes = await Promise.all([fulfillPaidCheckout(session()), fulfillPaidCheckout(session()), fulfillPaidCheckout(session())]);
  expect(outcomes.filter(Boolean)).toHaveLength(1);
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(12);
  expect(JSON.parse(redis.getString("user:user-1")!).tier).toBe("pay_as_you_go");
  expect(redis.getMembers("quota:daily:users")).toEqual(["user-2"]);
  const receipt = redis.getString("stripe:checkout:receipt:cs_test_paid")!;
  expect(JSON.parse(receipt)).toMatchObject({ creditsAdded: 10, amountTotal: 499, currency: "usd", taskId: "photo-1" });
  expect(receipt).not.toContain("private@example.com");
  expect(redis.getHash(`conversion:${new Date().toISOString().slice(0, 10)}`)).toEqual({ purchases: 1, revenue_minor_usd: 499 });
});
it("validates the user and daily index before any balance or receipt write", async () => {
  redis.setString("quota:daily:users", "corrupt");
  await expect(fulfillPaidCheckout(session())).rejects.toThrow("INVALID_DAILY_INDEX");
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(2);
  expect(JSON.parse(redis.getString("user:user-1")!).tier).toBe("free");
  expect(redis.getString("stripe:checkout:receipt:cs_test_paid")).toBeUndefined();
});
it("does not revive expired credit balances", async () => {
  redis.setString("quota:user-1", JSON.stringify({ credits: 99, creditsExpireAt: "2020-01-01T00:00:00.000Z" }));
  await fulfillPaidCheckout(session());
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(10);
});
it("skips unpaid, unknown plans, and another project's payments without EVAL", async () => {
  expect(await fulfillPaidCheckout(session({ payment_status: "unpaid" }))).toBe(false);
  expect(await fulfillPaidCheckout(session({ metadata: { userId: "user-1", plan: "unknown" } }))).toBe(false);
  expect(await fulfillPaidCheckout(session({ metadata: { userId: "user-1", plan: "starter_pack", product: "other" } }))).toBe(false);
  expect(mockEval).not.toHaveBeenCalled();
});
it("keeps legacy one-credit payments and Professional fulfillment compatible", async () => {
  await fulfillPaidCheckout(session({ id: "cs_legacy", metadata: { userId: "user-1", plan: "pay_as_you_go" } }));
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(3);
  await fulfillPaidCheckout(session({ id: "cs_pro", metadata: { userId: "user-1", plan: "professional" } }));
  expect(JSON.parse(redis.getString("user:user-1")!).tier).toBe("professional");
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(3);
});
it("honors old fulfillment markers without granting duplicate credits", async () => {
  redis.setString("stripe:checkout:fulfilled:cs_test_paid", "1");
  expect(await fulfillPaidCheckout(session())).toBe(false);
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(2);
});
it("does not downgrade professional access if a previously opened pack checkout completes", async () => {
  redis.setString("user:user-1", JSON.stringify({ id: "user-1", tier: "professional" }));
  await fulfillPaidCheckout(session());
  expect(JSON.parse(redis.getString("user:user-1")!).tier).toBe("professional");
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(12);
});
