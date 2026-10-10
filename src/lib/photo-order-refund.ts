import type Stripe from "stripe";
import type { Task } from "@/types";
import { getRedisClient, getTask } from "@/lib/redis";
import { getStripeClient } from "@/lib/stripe";

export interface PhotoOrderRefund {
  status: "pending" | "succeeded" | "review_required";
  idempotencyKey: string;
  requestedAt: string;
  refundId?: string;
  errorCode?: string;
  /** Durable lease also throttles observer-triggered recovery. */
  processingUntil?: number;
}
interface RefundOrder {
  id: string;
  userId: string;
  taskId: string;
  status: string;
  amountTotal: number;
  currency: string;
  paidSessionId?: string;
  paymentIntentId?: string;
  refund?: PhotoOrderRefund;
}
export const PHOTO_REFUND_QUEUE = "photo:refund:pending";
const orderKey = (id: string) => `photo:order:${id}`;
const decode = <T>(raw: unknown): T | null => raw == null ? null : typeof raw === "string" ? JSON.parse(raw) as T : raw as T;

// The failed task must already have been persisted by its execution fence.
// Reserve, stop retries, invalidate the execution token and enqueue recovery
// atomically before contacting Stripe. Never refund moderation rejections.
export const RESERVE_PHOTO_REFUND_SCRIPT = `
for i = 1, 2 do
  if redis.call('TYPE', KEYS[i]).ok ~= 'string' then return 'NOT_FOUND' end
end
for i = 3, 4 do
  local kind = redis.call('TYPE', KEYS[i]).ok
  if kind ~= 'none' and kind ~= 'zset' then return 'INVALID_QUEUE' end
end
local order = cjson.decode(redis.call('GET', KEYS[1]))
local task = cjson.decode(redis.call('GET', KEYS[2]))
if order.id ~= ARGV[1] or task.purchaseOrderId ~= order.id or order.taskId ~= task.id or order.userId ~= task.userId then return 'ORDER_MISMATCH' end
if order.amountTotal ~= 199 or order.currency ~= 'usd' or type(order.paidSessionId) ~= 'string' then return 'NOT_PAID' end
if type(order.refund) == 'table' then return order.refund.status end
if order.status ~= 'paid' then return 'NOT_PAID' end
if task.status ~= 'failed' or task.violation == true then return 'NOT_ELIGIBLE' end
local ambiguous = task.failureCode == 'provider_creation_unknown'
local unsettled = false
if type(task.providerInvocations) == 'table' then
  for _, invocation in pairs(task.providerInvocations) do
    if type(invocation) == 'table' and
      ((invocation.status == 'provider_creation_started' and task.providerCreationDefinitivelyRejected ~= true) or
       ((invocation.status == 'creation_unknown' or invocation.status == 'active') and not invocation.predictionId)) then ambiguous = true end
    if type(invocation) == 'table' and (invocation.status == 'creation_unknown' or invocation.status == 'active') then unsettled = true end
  end
end
local exhausted = (tonumber(task.attemptCount) or 1) >= 2 or task.deliveryUnrecoverable == true
-- Cleanup may permanently abandon a failed first attempt only after retention.
if ARGV[4] == 'retention_expired' then
  local anchor = task.completedAt
  if type(anchor) ~= 'string' then anchor = task.createdAt end
  if type(anchor) == 'string' and anchor < ARGV[5] then exhausted = true end
end
if exhausted and unsettled then ambiguous = true end
if not ambiguous and not exhausted then return 'RETRY_AVAILABLE' end
local state = 'pending'
local reason = nil
if ambiguous then state = 'review_required'; reason = 'PROVIDER_RESULT_UNCONFIRMED' end
if type(order.paymentIntentId) ~= 'string' or order.paymentIntentId == '' then state = 'review_required'; reason = 'PAYMENT_REFERENCE_MISSING' end
order.refund = {status=state,idempotencyKey='photo-order-refund:' .. order.id .. ':v1',requestedAt=ARGV[2],errorCode=reason}
order.status = state == 'pending' and 'refund_pending' or 'review_required'
order.updatedAt = ARGV[2]
task.refundStatus = state
task.refundRequestedAt = ARGV[2]
task.executionToken = cjson.null
task.executionStartedAt = cjson.null
local orderJson = cjson.encode(order)
local taskJson = cjson.encode(task)
redis.call('SET', KEYS[1], orderJson)
redis.call('SET', KEYS[2], taskJson)
redis.call('ZREM', KEYS[4], task.id)
if state == 'pending' then redis.call('ZADD', KEYS[3], ARGV[3], order.id) end
return state
`;

export const CLAIM_PHOTO_REFUND_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then redis.call('ZREM', KEYS[2], ARGV[1]); return '' end
local order = cjson.decode(raw)
if order.status ~= 'refund_pending' or type(order.refund) ~= 'table' or order.refund.status ~= 'pending' then
  redis.call('ZREM', KEYS[2], ARGV[1]); return ''
end
if (tonumber(order.refund.processingUntil) or 0) > tonumber(ARGV[2]) then return '' end
order.refund.processingUntil = tonumber(ARGV[2]) + 60000
local encoded = cjson.encode(order)
redis.call('SET', KEYS[1], encoded)
redis.call('ZADD', KEYS[2], order.refund.processingUntil, order.id)
return encoded
`;

export const SETTLE_PHOTO_REFUND_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'MISSING' end
local order = cjson.decode(raw)
if type(order.refund) ~= 'table' or order.refund.idempotencyKey ~= ARGV[1] then return 'STALE' end
if order.refund.status == 'succeeded' then return 'succeeded' end
-- A later response may prove success, but pending/failed cannot undo a review.
if order.refund.status == 'review_required' and ARGV[2] ~= 'succeeded' then return 'review_required' end
local taskRaw = redis.call('GET', KEYS[2])
local task = taskRaw and cjson.decode(taskRaw) or nil
local queueType = redis.call('TYPE', KEYS[3]).ok
if queueType ~= 'none' and queueType ~= 'zset' then return 'INVALID_QUEUE' end
order.refund.status = ARGV[2]
if ARGV[3] ~= '' then order.refund.refundId = ARGV[3] end
if ARGV[4] ~= '' then order.refund.errorCode = ARGV[4] else order.refund.errorCode = nil end
order.status = ARGV[2] == 'succeeded' and 'refunded' or (ARGV[2] == 'pending' and 'refund_pending' or 'review_required')
order.updatedAt = ARGV[5]
if task and task.purchaseOrderId == order.id then task.refundStatus = ARGV[2] end
local orderJson = cjson.encode(order)
local taskJson = task and cjson.encode(task) or nil
redis.call('SET', KEYS[1], orderJson)
if taskJson then redis.call('SET', KEYS[2], taskJson) end
if ARGV[2] ~= 'pending' then redis.call('ZREM', KEYS[3], order.id) end
return ARGV[2]
`;

async function settleRefund(order: RefundOrder, status: PhotoOrderRefund["status"], refundId?: string, errorCode?: string): Promise<void> {
  const result = await getRedisClient().eval(SETTLE_PHOTO_REFUND_SCRIPT,
    [orderKey(order.id), `task:${order.taskId}`, PHOTO_REFUND_QUEUE],
    [order.refund!.idempotencyKey, status, refundId ?? "", errorCode ?? "", new Date().toISOString()]);
  if (!["pending", "succeeded", "review_required"].includes(String(result))) throw new Error("REFUND_STATE_NOT_SAVED");
}

/** One bounded Stripe request; never reports an uncertain response as refunded. */
export async function recoverPhotoOrderRefund(orderId: string, now = new Date()): Promise<void> {
  const raw = await getRedisClient().eval(CLAIM_PHOTO_REFUND_SCRIPT,
    [orderKey(orderId), PHOTO_REFUND_QUEUE], [orderId, String(now.getTime())]);
  if (!raw) return;
  const order = decode<RefundOrder>(raw)!;
  const pending = order.refund!;
  const stripe = getStripeClient();
  const requestOptions = { timeout: 6_000, maxNetworkRetries: 0 };
  try {
    let refund: Stripe.Refund | undefined;
    if (pending.refundId) {
      refund = await stripe.refunds.retrieve(pending.refundId, requestOptions);
    } else if (now.getTime() - Date.parse(pending.requestedAt) >= 23 * 60 * 60 * 1000) {
      // The idempotency cache may expire after 24h. Reconcile read-only, never
      // issue a fresh create when the original outcome can no longer be replayed.
      const previous = await stripe.refunds.list({ payment_intent: order.paymentIntentId, limit: 100 }, requestOptions);
      refund = previous.data.find(item => item.metadata?.photoOrderId === order.id && item.amount === 199 && item.currency === "usd");
      if (!refund) {
        await settleRefund(order, "review_required", undefined, "REFUND_RESULT_UNCONFIRMED");
        return;
      }
    } else {
      refund = await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        amount: 199,
        metadata: { product: "oldphotoliveai", photoOrderId: order.id, taskId: order.taskId },
      }, { ...requestOptions, idempotencyKey: pending.idempotencyKey });
    }
    const paymentIntent = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
    if (refund.amount !== 199 || refund.currency !== "usd" || paymentIntent !== order.paymentIntentId) {
      await settleRefund(order, "review_required", refund.id, "REFUND_REFERENCE_MISMATCH");
      return;
    }
    const status = refund.status === "succeeded" ? "succeeded" : refund.status === "pending" ? "pending" : "review_required";
    await settleRefund(order, status, refund.id, status === "review_required" ? "REFUND_NEEDS_SUPPORT" : undefined);
  } catch {
    // The create might have succeeded. Leave the durable reservation in place
    // and retry its exact idempotency key, or retrieve its known refund ID.
    await settleRefund(order, "pending", undefined, "REFUND_UNCONFIRMED");
  }
}

/** Safe from worker completion, authenticated retry/status recovery, and cron. */
export async function reconcileTaskPhotoOrderRefund(taskId: string, options: { retentionExpired?: boolean; process?: boolean } = {}): Promise<void> {
  const task = await getTask(taskId);
  if (!task?.purchaseOrderId || task.status !== "failed" || task.violation) return;
  const now = new Date();
  const state = await getRedisClient().eval(RESERVE_PHOTO_REFUND_SCRIPT,
    [orderKey(task.purchaseOrderId), `task:${task.id}`, PHOTO_REFUND_QUEUE, "queue:tasks"],
    [task.purchaseOrderId, now.toISOString(), String(now.getTime()), options.retentionExpired ? "retention_expired" : "failure", new Date(now.getTime() - 7 * 86400000).toISOString()]);
  if (state === "pending" && options.process !== false) await recoverPhotoOrderRefund(task.purchaseOrderId, now);
}

/** Process a small bounded batch; the durable sorted set survives server restarts. */
export async function processPendingPhotoOrderRefunds(limit = 3): Promise<void> {
  const ids = await getRedisClient().zrange<string[]>(PHOTO_REFUND_QUEUE, 0, Date.now(), { byScore: true, offset: 0, count: Math.min(3, Math.max(1, limit)) });
  for (const id of ids) {
    try { await recoverPhotoOrderRefund(id); }
    catch { console.error(JSON.stringify({ message: "photo_refund_recovery_failed" })); }
  }
}

export function needsPhotoOrderRefundRecovery(task: Task): boolean {
  return Boolean(task.purchaseOrderId && task.status === "failed" && !task.violation && task.refundStatus !== "succeeded" && task.refundStatus !== "review_required");
}
