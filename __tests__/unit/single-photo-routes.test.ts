import { NextRequest } from "next/server";
import type Stripe from "stripe";
import type { Task } from "@/types";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockToken = jest.fn();
const mockAccess = jest.fn();
const mockEval = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockCreate = jest.fn();
const mockRetrieve = jest.fn();
const mockExpire = jest.fn();
const mockHead = jest.fn();
jest.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => mockToken(...args) }));
jest.mock("@/lib/task-access", () => ({ getAccessibleTask: (...args: unknown[]) => mockAccess(...args) }));
jest.mock("@/lib/config", () => ({ config: { stripe: { isEnabled: true, priceIds: {} }, nextauth: { url: "https://oldphotoliveai.com" } } }));
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval, get: mockGet, set: mockSet }), getUser: (id: string) => mockGet(`user:${id}`) }));
jest.mock("@/lib/r2", () => ({ headPrivateObjectFromR2: (...args: unknown[]) => mockHead(...args) }));
jest.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ checkout: { sessions: { create: mockCreate, retrieve: mockRetrieve, expire: mockExpire } } }) }));
import { reserveTaskDownloadCheckout, recoverTaskDownloadCheckoutSession } from "@/lib/task-download";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { GET as status } from "@/app/api/stripe/checkout/status/route";
import { POST as unlock } from "@/app/api/tasks/[taskId]/unlock/route";
let redis: RedisLuaFixture;
let stripeSession: Stripe.Checkout.Session;
const task = { id: "photo1", userId: "anon1", status: "completed", workflow: "animate", generationTier: "free", priority: "normal", downloadPolicy: "preview_v1", masterAssets: { restored: "master.jpg", animation: "master.mp4" } } as Task;
const checkoutRequest = () => new NextRequest("https://oldphotoliveai.com/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "single_photo", taskId: "photo1", locale: "zh" }) });
const unlockRequest = () => new NextRequest("https://oldphotoliveai.com/api/tasks/photo1/unlock", { method: "POST" });
const statusRequest = () => new NextRequest("https://oldphotoliveai.com/api/stripe/checkout/status?session_id=cs_test_single");
beforeEach(() => {
  jest.resetAllMocks();
  redis = new RedisLuaFixture();
  redis.setString("task:photo1", JSON.stringify(task));
  redis.setString("user:buyer", JSON.stringify({ id: "buyer", tier: "free" }));
  redis.setString("user:other", JSON.stringify({ id: "other", tier: "free" }));
  redis.setString("quota:buyer", JSON.stringify({ remaining: 0, credits: 1, creditsExpireAt: "2099-01-01T00:00:00.000Z" }));
  mockToken.mockResolvedValue({ userId: "buyer", email: "buyer@example.com" });
  mockAccess.mockResolvedValue({ task, mode: "anonymous" });
  mockHead.mockResolvedValue({ ContentLength: 20 });
  mockEval.mockImplementation((script, keys, args) => redis.eval(script, keys, args));
  mockGet.mockImplementation(async (key) => { const value = redis.getString(key); return value ? JSON.parse(value) : null; });
  mockSet.mockImplementation(async (key, value) => { redis.setString(key, JSON.stringify(value)); return "OK"; });
  mockCreate.mockImplementation(async (params) => {
    stripeSession = { id: "cs_test_single", url: "https://checkout.stripe.com/test-single", status: "open", payment_status: "unpaid", client_reference_id: "buyer", amount_total: 199, currency: "usd", metadata: params.metadata } as Stripe.Checkout.Session;
    return stripeSession;
  });
  mockRetrieve.mockImplementation(async () => stripeSession);
  mockExpire.mockImplementation(async () => { stripeSession = { ...stripeSession, status: "expired" }; return stripeSession; });
});
async function seedLegacyCheckout(create = true) {
  const reservation = await reserveTaskDownloadCheckout({ userId: "buyer", taskId: "photo1", ownerUserId: "anon1", params: {
    mode: "payment", metadata: { product: "oldphotoliveai", plan: "single_photo", userId: "buyer", taskId: "photo1", locale: "zh", scope: "result" },
  } });
  if (reservation.outcome === "rejected") throw new Error(reservation.code);
  if (create) await recoverTaskDownloadCheckoutSession(reservation.pending);
}
it("retires new single_photo sales without creating or recovering a Stripe session", async () => {
  const first = await checkout(checkoutRequest());
  expect(first.status).toBe(410); expect(await first.json()).toMatchObject({ code: "PLAN_RETIRED" });
  expect((await checkout(checkoutRequest())).status).toBe(410);
  expect(mockCreate).not.toHaveBeenCalled(); expect(mockRetrieve).not.toHaveBeenCalled();
});
it("does not inspect private masters or sell a retired result even if the result is unavailable", async () => {
  mockAccess.mockResolvedValue(null);
  expect((await checkout(checkoutRequest())).status).toBe(410);
  expect(mockHead).not.toHaveBeenCalled(); expect(mockCreate).not.toHaveBeenCalled();
});
it("never exposes the first purchaser's historical checkout to a different account", async () => {
  await seedLegacyCheckout(); mockToken.mockResolvedValue({ userId: "other" });
  expect((await checkout(checkoutRequest())).status).toBe(410);
  expect((await status(statusRequest())).status).toBe(404);
  expect(mockCreate).toHaveBeenCalledTimes(1);
});
it("settles payment into an actual result grant and reports unlock, not added credits or Professional", async () => {
  await seedLegacyCheckout();
  stripeSession = { ...stripeSession, status: "complete", payment_status: "paid" };
  const response = await status(statusRequest());
  const data = await response.json();
  expect(data).toMatchObject({ status: "fulfilled", fulfillmentKind: "task_unlock", creditsAdded: 0, unlockedTaskId: "photo1", assetScope: "result" });
  expect(data.transactionId).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.parse(redis.getString("user:buyer")!).tier).toBe("free");
  expect(JSON.parse(redis.getString("quota:buyer")!).credits).toBe(1);
  const repeat = await unlock(unlockRequest(), { params: Promise.resolve({ taskId: "photo1" }) });
  expect(await repeat.json()).toMatchObject({ unlocked: true, replayed: true, creditsDebited: 0 });
});
it("expires the buyer's unpaid single checkout before a credit unlock can consume the last credit", async () => {
  await seedLegacyCheckout();
  const response = await unlock(unlockRequest(), { params: Promise.resolve({ taskId: "photo1" }) });
  expect(await response.json()).toMatchObject({ unlocked: true, creditsDebited: 1 });
  expect(mockExpire).toHaveBeenCalledWith("cs_test_single");
  expect(JSON.parse(redis.getString("quota:buyer")!).credits).toBe(0);
  expect(JSON.parse(redis.getString("download:grant:photo1")!).source).toBe("credit");
});
it("does not debit a credit when pending checkout is already paid", async () => {
  await seedLegacyCheckout();
  stripeSession = { ...stripeSession, status: "complete", payment_status: "paid" };
  const response = await unlock(unlockRequest(), { params: Promise.resolve({ taskId: "photo1" }) });
  expect(await response.json()).toMatchObject({ unlocked: true, creditsDebited: 0 });
  expect(mockExpire).not.toHaveBeenCalled();
  expect(JSON.parse(redis.getString("quota:buyer")!).credits).toBe(1);
});
it("reports manual refund handling if a confirmed payment cannot be fulfilled", async () => {
  await seedLegacyCheckout();
  stripeSession = { ...stripeSession, status: "complete", payment_status: "paid" };
  await redis.eval("return redis.call('DEL', KEYS[1])", ["task:photo1"], []);
  const response = await status(statusRequest());
  expect(await response.json()).toEqual({ status: "refund_required", taskId: "photo1" });
  expect(redis.getString("download:grant:photo1")).toBeUndefined();
});
it("requires authentication on both payment and credit-unlock endpoints", async () => {
  mockToken.mockResolvedValue(null);
  expect((await checkout(checkoutRequest())).status).toBe(401);
  expect((await unlock(unlockRequest(), { params: Promise.resolve({ taskId: "photo1" }) })).status).toBe(401);
  expect(mockCreate).not.toHaveBeenCalled();
});

it("returns actionable review-needed status without replacing an old unidentified checkout", async () => {
  redis.setString("download:pending:photo1", JSON.stringify({ userId: "buyer", taskId: "photo1", ownerUserId: "anon1", orderId: "lost-order", createdAt: "2020-01-01T00:00:00.000Z", params: { mode: "payment" } }));
  const original = redis.getString("download:pending:photo1");
  const response = await checkout(checkoutRequest());
  expect(response.status).toBe(410);
  expect(await response.json()).toMatchObject({ code: "PLAN_RETIRED" });
  const creditResponse = await unlock(unlockRequest(), { params: Promise.resolve({ taskId: "photo1" }) });
  expect(creditResponse.status).toBe(409);
  expect(await creditResponse.json()).toMatchObject({ code: "CHECKOUT_REVIEW_REQUIRED", creditsDebited: 0 });
  expect(redis.getString("download:pending:photo1")).toBe(original);
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockExpire).not.toHaveBeenCalled();
  expect(JSON.parse(redis.getString("quota:buyer")!).credits).toBe(1);
});
it("keeps historical unknown checkout fenced when Stripe rejects its stale expires_at parameters", async () => {
  await seedLegacyCheckout(false);
  mockCreate.mockRejectedValue({ type: "StripeInvalidRequestError", statusCode: 400, param: "expires_at" });
  const pending = redis.getString("download:pending:photo1");
  for (let i = 0; i < 2; i++) {
    const response = await unlock(unlockRequest(), { params: Promise.resolve({ taskId: "photo1" }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "CHECKOUT_REVIEW_REQUIRED", error: expect.stringContaining("support@oldphotoliveai.com") });
  }
  expect(redis.getString("download:pending:photo1")).toBe(pending);
  expect(mockCreate.mock.calls[0]).toEqual(mockCreate.mock.calls[1]);
  expect(JSON.parse(redis.getString("quota:buyer")!).credits).toBe(1);
});
