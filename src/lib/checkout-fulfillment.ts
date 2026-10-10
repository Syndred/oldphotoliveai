import { fulfillPhotoOrderPaidSession } from "@/lib/photo-order";
import type Stripe from "stripe";
import { getRedisClient } from "@/lib/redis";
import { CREDIT_PACK_EXPIRATION_DAYS, getCreditPack, isCreditPackPlan, LEGACY_PAY_AS_YOU_GO_CREDITS, SINGLE_PHOTO } from "@/lib/billing";
import { DOWNLOAD_ELIGIBILITY_LUA, taskDownloadGrantKey, taskDownloadPendingKey, taskDownloadDeletingKey } from "@/lib/task-download";
import { checkoutLocale, safeCheckoutReturnTo, safeCheckoutTaskId } from "@/lib/checkout-context";

export interface CheckoutReceipt {
  transactionId: string;
  userId: string;
  plan: string;
  creditsAdded: number;
  fulfillmentKind?: "credits" | "task_unlock" | "professional" | "photo_processing";
  unlockedTaskId?: string;
  assetScope?: "result";
  amountTotal: number | null;
  currency: string | null;
  fulfilledAt: string;
  locale: string;
  taskId?: string;
  orderId?: string;
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
elseif receipt.plan == 'professional' then
  user.tier = 'professional'
  quota.tier = 'professional'
else
  return 'INVALID_PLAN'
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
  if (session.metadata?.product && session.metadata.product !== "oldphotoliveai") return false;
  if (plan === "single_run") {
    try { return await fulfillPhotoOrderPaidSession(session); }
    catch (error) {
      await recordCheckoutIssue({ userId, taskId: safeCheckoutTaskId(session.metadata?.taskId), transactionId: session.id, reason: error instanceof Error ? error.message : "PHOTO_ORDER_FULFILLMENT_DEFERRED", amountTotal: session.amount_total, currency: session.currency, recordedAt: new Date().toISOString() });
      throw error;
    }
  }
  if (plan === SINGLE_PHOTO.plan) return fulfillSinglePhotoCheckout(session);
  if (!isCreditPackPlan(plan) && plan !== "pay_as_you_go" && plan !== "professional") return false;
  if (session.metadata?.product && session.metadata.product !== "oldphotoliveai") return false;
  const credits = isCreditPackPlan(plan) ? getCreditPack(plan).credits : plan === "pay_as_you_go" ? LEGACY_PAY_AS_YOU_GO_CREDITS : 0;
  const now = new Date();
  const locale = checkoutLocale(session.metadata?.locale);
  const receipt: CheckoutReceipt = {
    transactionId: session.id, userId, plan, creditsAdded: credits,
    fulfillmentKind: plan === "professional" ? "professional" : "credits",
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


export interface CheckoutRefundRequired {
  userId: string;
  taskId?: string;
  transactionId: string;
  reason: string;
  amountTotal: number | null;
  currency: string | null;
  recordedAt: string;
}
export const checkoutRefundRequiredKey = (id: string) => `stripe:checkout:refund_required:${id}`;
export async function getCheckoutRefundRequired(sessionId: string): Promise<CheckoutRefundRequired | null> {
  const raw = await getRedisClient().get<CheckoutRefundRequired | string>(checkoutRefundRequiredKey(sessionId));
  return typeof raw === "string" ? JSON.parse(raw) as CheckoutRefundRequired : raw;
}
export const RECORD_CHECKOUT_ISSUE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 'ALREADY_RECORDED' end
redis.call('SET', KEYS[1], ARGV[1])
local metricType = redis.call('TYPE', KEYS[2]).ok
if metricType == 'none' or metricType == 'hash' then
  redis.pcall('HINCRBY', KEYS[2], 'fulfillment_issues', 1)
  redis.pcall('EXPIRE', KEYS[2], 34560000)
end
return 'RECORDED'
`;
async function recordCheckoutIssue(issue: CheckoutRefundRequired): Promise<void> {
  await getRedisClient().eval(RECORD_CHECKOUT_ISSUE_SCRIPT,
    [checkoutRefundRequiredKey(issue.transactionId), `conversion:${issue.recordedAt.slice(0, 10)}`], [JSON.stringify(issue)]);
}
export const SINGLE_PHOTO_FULFILL_SCRIPT = DOWNLOAD_ELIGIBILITY_LUA + `
if redis.call('EXISTS', KEYS[1]) == 1 then return 'ALREADY_FULFILLED' end
local receipt = cjson.decode(ARGV[1])
local grant = cjson.decode(ARGV[2])
local function refundRequired(reason)
  if redis.call('EXISTS', KEYS[8]) == 0 then
    redis.call('SET', KEYS[8], cjson.encode({userId=receipt.userId,taskId=receipt.taskId,transactionId=receipt.transactionId,reason=reason,amountTotal=receipt.amountTotal,currency=receipt.currency,recordedAt=receipt.fulfilledAt}))
    local metricType = redis.call('TYPE', KEYS[7]).ok
    if metricType == 'none' or metricType == 'hash' then
      redis.pcall('HINCRBY', KEYS[7], 'fulfillment_issues', 1)
      redis.pcall('EXPIRE', KEYS[7], 34560000)
    end
  end
  return 'REFUND_REQUIRED'
end
for i = 1, 5 do if not stringKey(KEYS[i]) then return refundRequired('INVALID_KEY') end end
local historyType = redis.call('TYPE', KEYS[6]).ok
if historyType ~= 'none' and historyType ~= 'zset' then return refundRequired('INVALID_HISTORY') end
if redis.call('EXISTS', KEYS[9]) ~= 1 then return refundRequired('USER_NOT_FOUND') end
if redis.call('EXISTS', KEYS[5]) == 1 then return refundRequired('TASK_DELETING') end
local taskRaw = redis.call('GET', KEYS[2])
if not taskRaw then return refundRequired('TASK_NOT_FOUND') end
local task = cjson.decode(taskRaw)
if not eligible(task) then return refundRequired('RESULT_UNAVAILABLE') end
local pendingRaw = redis.call('GET', KEYS[4])
if not pendingRaw then return refundRequired('ORDER_NOT_FOUND') end
local pending = cjson.decode(pendingRaw)
if pending.orderId ~= ARGV[3] or pending.userId ~= receipt.userId or pending.taskId ~= task.id or pending.ownerUserId ~= task.userId then return refundRequired('ORDER_MISMATCH') end
if pending.sessionId and pending.sessionId ~= receipt.transactionId then return refundRequired('SESSION_MISMATCH') end
if redis.call('EXISTS', KEYS[3]) == 1 then return refundRequired('DUPLICATE_PAYMENT') end
-- Every write below is part of the same Redis transaction; no quota or tier writes.
redis.call('SET', KEYS[3], ARGV[2])
redis.call('SET', KEYS[1], ARGV[1])
redis.call('ZADD', KEYS[6], ARGV[4], task.id)
redis.call('DEL', KEYS[4])
local metricType = redis.call('TYPE', KEYS[7]).ok
if metricType == 'none' or metricType == 'hash' then
  redis.pcall('HINCRBY', KEYS[7], 'purchases', 1)
  redis.pcall('HINCRBY', KEYS[7], 'single_photo_purchases', 1)
  redis.pcall('HINCRBY', KEYS[7], 'revenue_minor_usd', receipt.amountTotal)
  redis.pcall('EXPIRE', KEYS[7], 34560000)
end
return 'FULFILLED'
`;
async function fulfillSinglePhotoCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const userId = session.metadata!.userId;
  const taskId = safeCheckoutTaskId(session.metadata?.taskId);
  const orderId = session.metadata?.orderId;
  if (session.metadata?.product !== "oldphotoliveai" || session.metadata?.scope !== "result" || !taskId || !orderId || session.amount_total !== SINGLE_PHOTO.unitAmount || session.currency !== SINGLE_PHOTO.currency) {
    await recordCheckoutIssue({
      userId, taskId, transactionId: session.id, reason: "INVALID_SINGLE_PHOTO_PAYMENT",
      amountTotal: session.amount_total, currency: session.currency, recordedAt: new Date().toISOString(),
    });
    return false;
  }
  const now = new Date();
  const locale = checkoutLocale(session.metadata?.locale);
  const receipt: CheckoutReceipt = {
    userId, taskId, transactionId: session.id, plan: SINGLE_PHOTO.plan, creditsAdded: 0,
    fulfillmentKind: "task_unlock", unlockedTaskId: taskId, assetScope: "result",
    amountTotal: session.amount_total, currency: session.currency, fulfilledAt: now.toISOString(), locale,
  };
  const grant = { userId, taskId, source: "single_photo", scope: "result", creditsDebited: 0, grantedAt: now.toISOString(), checkoutSessionId: session.id };
  const result = await getRedisClient().eval(SINGLE_PHOTO_FULFILL_SCRIPT,
    [checkoutReceiptKey(session.id), `task:${taskId}`, taskDownloadGrantKey(taskId), taskDownloadPendingKey(taskId), taskDownloadDeletingKey(taskId), `user:${userId}:tasks`, `conversion:${now.toISOString().slice(0,10)}`, checkoutRefundRequiredKey(session.id), `user:${userId}`],
    [JSON.stringify(receipt), JSON.stringify(grant), orderId, String(now.getTime())]);
  if (result === "FULFILLED") return true;
  if (result === "ALREADY_FULFILLED" || result === "REFUND_REQUIRED") return false;
  throw new Error(`Single-result fulfillment failed: ${String(result)}`);
}
