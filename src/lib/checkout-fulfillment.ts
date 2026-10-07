import type Stripe from "stripe";
import { getRedisClient } from "@/lib/redis";
import { CREDIT_PACK_EXPIRATION_DAYS, getCreditPack, isCreditPackPlan, LEGACY_PAY_AS_YOU_GO_CREDITS } from "@/lib/billing";
import { checkoutLocale, safeCheckoutReturnTo, safeCheckoutTaskId } from "@/lib/checkout-context";

export interface CheckoutReceipt {
  transactionId: string;
  userId: string;
  plan: string;
  creditsAdded: number;
  amountTotal: number | null;
  currency: string | null;
  fulfilledAt: string;
  locale: string;
  taskId?: string;
  returnTo?: string;
}
export const checkoutReceiptKey = (id: string) => `stripe:checkout:receipt:${id}`;

// One transaction: no claim can survive without both the entitlement and receipt.
// All decoding/validation happens before writes; Redis scripts do not roll back errors.
export const CHECKOUT_FULFILL_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 'ALREADY_FULFILLED' end
if redis.call('EXISTS', KEYS[5]) == 1 then return 'LEGACY_FULFILLED' end
local userRaw = redis.call('GET', KEYS[2])
if not userRaw then return 'USER_NOT_FOUND' end
local user = cjson.decode(userRaw)
local receipt = cjson.decode(ARGV[1])
local quotaRaw = redis.call('GET', KEYS[3])
local quota = quotaRaw and cjson.decode(quotaRaw) or {userId=receipt.userId, tier='pay_as_you_go',remaining=0,dailyLimit=cjson.null,resetAt=cjson.null,credits=0,creditsExpireAt=cjson.null}
local credits = tonumber(quota.credits) or 0
if receipt.creditsAdded > 0 then
  if type(quota.creditsExpireAt) == 'string' and quota.creditsExpireAt < receipt.fulfilledAt then credits = 0 end
  quota.credits = credits + receipt.creditsAdded
  quota.creditsExpireAt = ARGV[2]
  if user.tier ~= 'professional' then user.tier = 'pay_as_you_go' end
  quota.tier = user.tier
else
  user.tier = 'professional'
  quota.tier = 'professional'
end
user.updatedAt = receipt.fulfilledAt
local userJson = cjson.encode(user)
local quotaJson = cjson.encode(quota)
local dailyType = redis.call('TYPE', KEYS[4]).ok
if dailyType ~= 'none' and dailyType ~= 'set' then return 'INVALID_DAILY_INDEX' end
redis.call('SET', KEYS[2], userJson)
redis.call('SET', KEYS[3], quotaJson)
redis.call('SREM', KEYS[4], receipt.userId)
redis.call('SET', KEYS[1], ARGV[1])
local metricType = redis.call('TYPE', KEYS[6]).ok
if metricType == 'none' or metricType == 'hash' then
  redis.pcall('HINCRBY', KEYS[6], 'purchases', 1)
  if receipt.currency == 'usd' and type(receipt.amountTotal) == 'number' then
    redis.pcall('HINCRBY', KEYS[6], 'revenue_minor_usd', receipt.amountTotal)
  end
  redis.pcall('EXPIRE', KEYS[6], 34560000)
end
return 'FULFILLED'
`;

export async function getCheckoutReceipt(sessionId: string): Promise<CheckoutReceipt | null> {
  const raw = await getRedisClient().get<CheckoutReceipt | string>(checkoutReceiptKey(sessionId));
  return typeof raw === "string" ? JSON.parse(raw) as CheckoutReceipt : raw;
}
export async function fulfillPaidCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  if (!userId || !plan || session.payment_status !== "paid") return false;
  if (!isCreditPackPlan(plan) && plan !== "pay_as_you_go" && plan !== "professional") return false;
  if (session.metadata?.product && session.metadata.product !== "oldphotoliveai") return false;
  const credits = isCreditPackPlan(plan) ? getCreditPack(plan).credits : plan === "pay_as_you_go" ? LEGACY_PAY_AS_YOU_GO_CREDITS : 0;
  const now = new Date();
  const locale = checkoutLocale(session.metadata?.locale);
  const receipt: CheckoutReceipt = {
    transactionId: session.id, userId, plan, creditsAdded: credits,
    amountTotal: session.amount_total, currency: session.currency,
    fulfilledAt: now.toISOString(), locale,
    taskId: safeCheckoutTaskId(session.metadata?.taskId),
    returnTo: safeCheckoutReturnTo(session.metadata?.returnTo, locale),
  };
  const expiry = new Date(now.getTime() + (plan === "pay_as_you_go" ? 30 : CREDIT_PACK_EXPIRATION_DAYS) * 86400000).toISOString();
  const result = await getRedisClient().eval(CHECKOUT_FULFILL_SCRIPT,
    [checkoutReceiptKey(session.id), `user:${userId}`, `quota:${userId}`, "quota:daily:users", `stripe:checkout:fulfilled:${session.id}`, `conversion:${now.toISOString().slice(0, 10)}`],
    [JSON.stringify(receipt), expiry]);
  if (result === "FULFILLED") return true;
  if (result === "ALREADY_FULFILLED" || result === "LEGACY_FULFILLED") return false;
  throw new Error(`Checkout fulfillment failed: ${String(result)}`);
}
