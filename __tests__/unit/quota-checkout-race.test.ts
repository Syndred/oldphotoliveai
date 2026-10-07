import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockEval = jest.fn();
const mockSmembers = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval, smembers: mockSmembers }) }));
import { CHECKOUT_FULFILL_SCRIPT } from "@/lib/checkout-fulfillment";
import { resetAllDailyQuotas, cleanExpiredCredits } from "@/lib/quota";
let redis: RedisLuaFixture;
const userId = "u1";
const now = "2026-10-07T00:00:00.000Z";
const expiry = "2027-10-07T00:00:00.000Z";
const receipt = { userId, transactionId: "cs_paid", plan: "starter_pack", creditsAdded: 10, amountTotal: 499, currency: "usd", fulfilledAt: now };
const grant = () => redis.eval(CHECKOUT_FULFILL_SCRIPT,
  ["stripe:checkout:receipt:cs_paid", "user:u1", "quota:u1", "quota:daily:users", "stripe:checkout:fulfilled:cs_paid", "conversion:2026-10-07"],
  [JSON.stringify(receipt), expiry]);
const quota = () => JSON.parse(redis.getString("quota:u1")!);
beforeEach(() => {
  redis = new RedisLuaFixture();
  redis.setString("user:u1", JSON.stringify({ id: userId, tier: "free" }));
  redis.setString("quota:u1", JSON.stringify({ userId, tier: "free", remaining: 0, credits: 0, creditsExpireAt: null }));
  redis.setMembers("quota:daily:users", [userId]);
  mockEval.mockReset().mockImplementation((script, keys, args) => redis.eval(script, keys, args));
  mockSmembers.mockReset().mockResolvedValue([userId]); // can be a stale pre-checkout list
});
it("a stale daily-reset list cannot overwrite credited balances or a durable receipt", async () => {
  await grant();
  await resetAllDailyQuotas();
  expect(quota()).toMatchObject({ tier: "pay_as_you_go", remaining: 0, credits: 10, creditsExpireAt: expiry });
  expect(redis.getString("stripe:checkout:receipt:cs_paid")).toBeDefined();
  expect(redis.getMembers("quota:daily:users")).toEqual([]);
});
it("daily reset followed by checkout also retains every purchased credit", async () => {
  await resetAllDailyQuotas();
  await grant();
  expect(quota()).toMatchObject({ tier: "pay_as_you_go", credits: 10 });
});
it("checks the latest user tier even when quota still says free", async () => {
  redis.setString("user:u1", JSON.stringify({ id: userId, tier: "professional" }));
  await resetAllDailyQuotas();
  expect(quota()).toMatchObject({ remaining: 0, credits: 0, creditsExpireAt: null });
  expect(redis.getMembers("quota:daily:users")).toEqual([]);
});
it("resets only free allowance fields while preserving an existing credit balance", async () => {
  redis.setString("quota:u1", JSON.stringify({ userId, tier: "free", remaining: 0, credits: 4, creditsExpireAt: expiry }));
  await resetAllDailyQuotas();
  expect(quota()).toMatchObject({ remaining: 1, credits: 4, creditsExpireAt: expiry });
});
it("expiry cleanup reads the current purchase expiry rather than a pre-purchase snapshot", async () => {
  redis.setString("quota:u1", JSON.stringify({ userId, tier: "free", remaining: 0, credits: 3, creditsExpireAt: "2020-01-01T00:00:00.000Z" }));
  await grant();
  await cleanExpiredCredits(userId);
  expect(quota()).toMatchObject({ credits: 10, creditsExpireAt: expiry });
});
it("expiry cleanup before a purchase clears only expired credits then accepts new credits", async () => {
  redis.setString("quota:u1", JSON.stringify({ userId, tier: "free", remaining: 0, credits: 3, creditsExpireAt: "2020-01-01T00:00:00.000Z" }));
  await cleanExpiredCredits(userId);
  expect(quota()).toMatchObject({ credits: 0, creditsExpireAt: null });
  await grant();
  expect(quota()).toMatchObject({ credits: 10, creditsExpireAt: expiry });
});
