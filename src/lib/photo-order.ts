import { createHash, randomUUID } from "node:crypto";
import { CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import type Stripe from "stripe";
import { getRedisClient } from "@/lib/redis";
import { getS3Client, deleteFromR2 } from "@/lib/r2";
import { getStripeClient } from "@/lib/stripe";
import { config } from "@/lib/config";
import { SINGLE_RUN } from "@/lib/billing";
import { checkoutLocale, pricingCheckoutPath } from "@/lib/checkout-context";
import { TaskCheckoutReviewRequiredError } from "@/lib/task-download";
import { buildTask } from "@/lib/task-creation";
import { PRIORITY_WEIGHTS, type Task, type TaskWorkflow } from "@/types";
import type { PhotoOrderRefund } from "@/lib/photo-order-refund";

export interface PhotoOrderCheckout {
  attemptId: string;
  createdAt: string;
  sessionId?: string;
  params: Stripe.Checkout.SessionCreateParams;
}
export interface PhotoOrder {
  id: string;
  userId: string;
  taskId: string;
  imageKey: string;
  sourceImageKey?: string;
  workflow: TaskWorkflow;
  locale: string;
  status: "unpaid" | "paid" | "refund_pending" | "refunded" | "review_required" | "expired";
  amountTotal: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  checkout?: PhotoOrderCheckout;
  expiredSessionIds?: string[];
  paidSessionId?: string;
  paymentIntentId?: string;
  paidAt?: string;
  refund?: PhotoOrderRefund;
}
export const PHOTO_ORDER_CLEANUP_QUEUE = "photo:order:cleanup";
const DRAFT_RETENTION_MS = 7 * 86400000;
const STRIPE_REQUEST_OPTIONS = { timeout: 6_000, maxNetworkRetries: 0 };
export const photoOrderKey = (orderId: string) => `photo:order:${orderId}`;
export function isPhotoOrderId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}
export function isPhotoOrderWorkflow(value: unknown): value is TaskWorkflow {
  return value === "restore" || value === "colorize" || value === "animate" || value === "full";
}
function parse<T>(raw: unknown): T | null {
  return raw == null ? null : typeof raw === "string" ? JSON.parse(raw) as T : raw as T;
}
export async function getPhotoOrder(orderId: string): Promise<PhotoOrder | null> {
  return parse<PhotoOrder>(await getRedisClient().get(photoOrderKey(orderId)));
}
export async function getPhotoOrderOwnedByUser(orderId: string, userId: string): Promise<PhotoOrder | null> {
  const order = await getPhotoOrder(orderId);
  return order?.userId === userId ? order : null;
}
export async function assertPhotoOrderSourceExists(imageKey: string): Promise<void> {
  const object = await getS3Client().send(new HeadObjectCommand({ Bucket: config.r2.bucketName, Key: imageKey }));
  if (!object.ContentLength || object.ContentLength <= 0) throw new Error("SOURCE_UNAVAILABLE");
}
export const CREATE_PHOTO_ORDER_SCRIPT = `
local previous = redis.call('GET', KEYS[1])
if previous then
  local raw = redis.call('GET', 'photo:order:' .. previous)
  if not raw then return {'ERROR', 'ORDER_REVIEW_REQUIRED'} end
  return {'EXISTING', raw}
end
local queueType = redis.call('TYPE', KEYS[3]).ok
if queueType ~= 'none' and queueType ~= 'zset' then return {'ERROR', 'INVALID_QUEUE'} end
redis.call('SET', KEYS[2], ARGV[1])
redis.call('SET', KEYS[1], ARGV[2])
redis.call('ZADD', KEYS[3], ARGV[3], ARGV[2])
return {'CREATED', ARGV[1]}
`;
export async function createPhotoOrder(input: { userId: string; imageKey: string; workflow: TaskWorkflow; locale: string }) {
  const digest = createHash("sha256").update(`${input.userId}\0${input.imageKey}\0${input.workflow}`).digest("hex");
  const sourceKey = `photo:order:source:${digest}`;
  const existingId = await getRedisClient().get<string>(sourceKey);
  if (existingId) {
    const existing = await getPhotoOrder(existingId);
    if (!existing || existing.userId !== input.userId) throw new TaskCheckoutReviewRequiredError();
    return { order: existing, created: false };
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  const extension = input.imageKey.match(/\.(jpg|jpeg|png|webp)$/i)?.[0]?.toLowerCase() ?? ".jpg";
  const imageKey = `tasks/${id}/original${extension}`;
  // Each order owns its source so deleting another workflow cannot break it.
  await getS3Client().send(new CopyObjectCommand({ Bucket: config.r2.bucketName,
    CopySource: `${config.r2.bucketName}/${input.imageKey.split("/").map(encodeURIComponent).join("/")}`, Key: imageKey }));
  const order: PhotoOrder = { ...input, id, taskId: randomUUID(), imageKey, sourceImageKey: input.imageKey, locale: checkoutLocale(input.locale), status: "unpaid", amountTotal: SINGLE_RUN.unitAmount, currency: SINGLE_RUN.currency, createdAt: now, updatedAt: now };
  // An EVAL timeout can mean success: retain this source when the result is unknown.
  const result = await getRedisClient().eval(CREATE_PHOTO_ORDER_SCRIPT,
    [sourceKey, photoOrderKey(order.id), PHOTO_ORDER_CLEANUP_QUEUE], [JSON.stringify(order), order.id, String(Date.parse(now) + DRAFT_RETENTION_MS)]) as unknown[];
  if (result[0] !== "CREATED") await deleteFromR2(imageKey).catch(() => undefined);
  if (result[0] !== "CREATED" && result[0] !== "EXISTING") throw new TaskCheckoutReviewRequiredError();
  return { order: parse<PhotoOrder>(result[1])!, created: result[0] === "CREATED" };
}

export const RESERVE_PHOTO_ORDER_CHECKOUT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'REJECTED', 'ORDER_NOT_FOUND'} end
local order = cjson.decode(raw)
if order.userId ~= ARGV[1] then return {'REJECTED', 'ORDER_NOT_FOUND'} end
if order.status ~= 'unpaid' then return {'REJECTED', order.status == 'paid' and 'ORDER_ALREADY_PAID' or 'ORDER_REVIEW_REQUIRED'} end
if order.checkout and order.checkout ~= cjson.null then return {'EXISTING', raw} end
order.checkout = cjson.decode(ARGV[2])
order.updatedAt = ARGV[3]
local encoded = cjson.encode(order)
redis.call('SET', KEYS[1], encoded)
return {'RESERVED', encoded}
`;
export async function reservePhotoOrderCheckout(order: PhotoOrder, customerEmail?: string): Promise<PhotoOrder> {
  const locale = checkoutLocale(order.locale);
  const attemptId = randomUUID();
  const checkout: PhotoOrderCheckout = {
    attemptId, createdAt: new Date().toISOString(),
    params: {
      mode: "payment", payment_method_types: ["card"], client_reference_id: order.userId,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 199, product_data: { name: SINGLE_RUN.name, metadata: { plan: "single_run", workflow: order.workflow } } } }],
      success_url: `${config.nextauth.url}${pricingCheckoutPath(locale, {}, { orderId: order.id })}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.nextauth.url}${pricingCheckoutPath(locale, {}, { orderId: order.id, plan: "single_run", cancelled: "true" })}`,
      metadata: { product: "oldphotoliveai", plan: "single_run", userId: order.userId, orderId: order.id, taskId: order.taskId, workflow: order.workflow, locale, attemptId },
    },
  };
  const result = await getRedisClient().eval(RESERVE_PHOTO_ORDER_CHECKOUT_SCRIPT, [photoOrderKey(order.id)], [order.userId, JSON.stringify(checkout), checkout.createdAt]) as unknown[];
  if (result[0] !== "RESERVED" && result[0] !== "EXISTING") throw new TaskCheckoutReviewRequiredError();
  return parse<PhotoOrder>(result[1])!;
}
export const UPDATE_PHOTO_ORDER_CHECKOUT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'MISSING' end
local order = cjson.decode(raw)
if order.status ~= 'unpaid' or not order.checkout or order.checkout.attemptId ~= ARGV[1] then return 'STALE' end
if ARGV[2] == 'expire' then
  if order.checkout.sessionId ~= ARGV[3] then return 'SESSION_MISMATCH' end
  order.expiredSessionIds = order.expiredSessionIds or {}
  table.insert(order.expiredSessionIds, ARGV[3])
  order.checkout = nil
else
  if order.checkout.sessionId and order.checkout.sessionId ~= ARGV[3] then return 'SESSION_MISMATCH' end
  order.checkout.sessionId = ARGV[3]
end
order.updatedAt = ARGV[4]
redis.call('SET', KEYS[1], cjson.encode(order))
return 'UPDATED'
`;
export async function recoverPhotoOrderCheckoutSession(order: PhotoOrder): Promise<Stripe.Checkout.Session> {
  const checkout = order.checkout;
  if (!checkout) throw new TaskCheckoutReviewRequiredError();
  const stripe = getStripeClient();
  if (checkout.sessionId) return stripe.checkout.sessions.retrieve(checkout.sessionId, STRIPE_REQUEST_OPTIONS);
  const createdAt = Date.parse(checkout.createdAt);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt >= 23 * 60 * 60 * 1000) throw new TaskCheckoutReviewRequiredError();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(checkout.params, { ...STRIPE_REQUEST_OPTIONS, idempotencyKey: `photo-order:${order.id}:${checkout.attemptId}` });
  } catch (error) {
    const failure = error as { type?: string; param?: string };
    if (failure?.type === "StripeIdempotencyError" || (failure?.type === "StripeInvalidRequestError" && failure.param === "expires_at")) throw new TaskCheckoutReviewRequiredError();
    throw error;
  }
  const result = await getRedisClient().eval(UPDATE_PHOTO_ORDER_CHECKOUT_SCRIPT, [photoOrderKey(order.id)], [checkout.attemptId, "save", session.id, new Date().toISOString()]);
  if (result === "SESSION_MISMATCH") throw new TaskCheckoutReviewRequiredError();
  return session;
}
export async function expirePhotoOrderCheckout(order: PhotoOrder, session: Stripe.Checkout.Session): Promise<void> {
  if (!order.checkout || session.status !== "expired" || session.payment_status !== "unpaid") throw new Error("CHECKOUT_NOT_CONFIRMED_EXPIRED");
  await getRedisClient().eval(UPDATE_PHOTO_ORDER_CHECKOUT_SCRIPT, [photoOrderKey(order.id)], [order.checkout.attemptId, "expire", session.id, new Date().toISOString()]);
}

export const FULFILL_PHOTO_ORDER_SCRIPT = `
local stringKey = function(key)
  local kind = redis.call('TYPE', key).ok
  return kind == 'none' or kind == 'string'
end
for i = 1, 4 do if not stringKey(KEYS[i]) then return 'INVALID_KEY' end end
for i = 5, 6 do
  local kind = redis.call('TYPE', KEYS[i]).ok
  if kind ~= 'none' and kind ~= 'zset' then return 'INVALID_QUEUE_OR_HISTORY' end
end
if redis.call('EXISTS', KEYS[1]) == 1 then return 'ALREADY_FULFILLED' end
local raw = redis.call('GET', KEYS[2])
if not raw then return 'ORDER_NOT_FOUND' end
local order = cjson.decode(raw)
local receipt = cjson.decode(ARGV[1])
if order.userId ~= receipt.userId or order.id ~= receipt.orderId or order.taskId ~= receipt.taskId then return 'ORDER_MISMATCH' end
if order.status ~= 'unpaid' then return order.paidSessionId == receipt.transactionId and 'ALREADY_FULFILLED' or 'ORDER_ALREADY_PAID' end
if not order.checkout or order.checkout.attemptId ~= ARGV[3] then return 'ATTEMPT_MISMATCH' end
if order.checkout.sessionId and order.checkout.sessionId ~= receipt.transactionId then return 'SESSION_MISMATCH' end
if redis.call('EXISTS', KEYS[4]) ~= 1 then return 'USER_NOT_FOUND' end
if redis.call('EXISTS', KEYS[3]) == 1 then return 'TASK_CONFLICT' end
local task = cjson.decode(ARGV[2])
if task.id ~= order.taskId or task.purchaseOrderId ~= order.id or task.userId ~= order.userId or task.originalImageKey ~= order.imageKey or task.workflow ~= order.workflow then return 'TASK_MISMATCH' end
order.status = 'paid'
order.paidSessionId = receipt.transactionId
order.paymentIntentId = ARGV[4]
order.paidAt = receipt.fulfilledAt
order.updatedAt = receipt.fulfilledAt
order.checkout.sessionId = receipt.transactionId
local orderJson = cjson.encode(order)
redis.call('SET', KEYS[3], ARGV[2])
redis.call('ZADD', KEYS[5], ARGV[5], task.id)
redis.call('ZADD', KEYS[6], ARGV[6], task.id)
redis.call('SET', KEYS[2], orderJson)
redis.call('SET', KEYS[1], ARGV[1])
local metricType = redis.call('TYPE', KEYS[7]).ok
if metricType == 'none' or metricType == 'hash' then
  redis.pcall('HINCRBY', KEYS[7], 'purchases', 1)
  redis.pcall('HINCRBY', KEYS[7], 'single_run_purchases', 1)
  redis.pcall('HINCRBY', KEYS[7], 'revenue_minor_usd', 199)
  redis.pcall('EXPIRE', KEYS[7], 34560000)
end
return 'FULFILLED'
`;
export async function fulfillPhotoOrderPaidSession(session: Stripe.Checkout.Session): Promise<boolean> {
  const metadata = session.metadata;
  if (session.payment_status !== "paid" || metadata?.product !== "oldphotoliveai" || metadata.plan !== "single_run") return false;
  const orderId = metadata.orderId;
  if (!isPhotoOrderId(orderId) || !metadata.userId || !metadata.attemptId || session.amount_total !== 199 || session.currency !== "usd" || !session.payment_intent) throw new Error("INVALID_PAID_PHOTO_ORDER");
  const order = await getPhotoOrder(orderId);
  if (!order || order.amountTotal !== 199 || order.currency !== "usd" || order.userId !== metadata.userId || order.taskId !== metadata.taskId || order.workflow !== metadata.workflow || (session.client_reference_id && session.client_reference_id !== order.userId)) throw new Error("PAID_PHOTO_ORDER_MISMATCH");
  const now = new Date();
  const task: Task = { ...buildTask(order.userId, order.imageKey, "high", order.workflow, now), id: order.taskId, generationTier: "pay_as_you_go", purchaseOrderId: order.id };
  const receipt = { transactionId: session.id, userId: order.userId, plan: "single_run", creditsAdded: 0, fulfillmentKind: "photo_processing", amountTotal: 199, currency: "usd", fulfilledAt: now.toISOString(), locale: order.locale, taskId: order.taskId, orderId: order.id };
  const result = await getRedisClient().eval(FULFILL_PHOTO_ORDER_SCRIPT,
    [`stripe:checkout:receipt:${session.id}`, photoOrderKey(order.id), `task:${order.taskId}`, `user:${order.userId}`, `user:${order.userId}:tasks`, "queue:tasks", `conversion:${now.toISOString().slice(0,10)}`],
    [JSON.stringify(receipt), JSON.stringify(task), metadata.attemptId, typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id, String(now.getTime()), String(PRIORITY_WEIGHTS.high + now.getTime())]);
  if (result === "FULFILLED") return true;
  if (result === "ALREADY_FULFILLED") return false;
  throw new Error(`Photo order fulfillment deferred: ${String(result)}`);
}


// Claim before deleting the source: checkout reservation must observe expired.
// Keep the tombstone and source dedup pointer so an old page cannot repay it.
export const CLAIM_PHOTO_ORDER_CLEANUP_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'MISSING' end
local order = cjson.decode(raw)
if order.status == 'expired' then return 'CLAIMED' end
if order.status ~= 'unpaid' then return 'INELIGIBLE' end
if order.createdAt > ARGV[1] then return 'TOO_NEW' end
if order.checkout and order.checkout ~= cjson.null then return 'CHECKOUT_PENDING' end
order.status = 'expired'
order.updatedAt = ARGV[2]
redis.call('SET', KEYS[1], cjson.encode(order))
return 'CLAIMED'
`;
export async function cleanupUnpaidPhotoOrders(limit = 3): Promise<{ checked: number; deleted: number; deferred: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const ids = await redis.zrange<string[]>(PHOTO_ORDER_CLEANUP_QUEUE, 0, now, { byScore: true, offset: 0, count: Math.min(10, Math.max(1, limit)) });
  const result = { checked: ids.length, deleted: 0, deferred: 0 };
  for (const id of ids) {
    try {
      let order = await getPhotoOrder(id);
      if (!order || (order.status !== "unpaid" && order.status !== "expired")) {
        await redis.zrem(PHOTO_ORDER_CLEANUP_QUEUE, id); continue;
      }
      if (order.status === "unpaid" && order.checkout) {
        if (!order.checkout.sessionId) throw new Error("CHECKOUT_UNRESOLVED");
        const session = await getStripeClient().checkout.sessions.retrieve(order.checkout.sessionId, STRIPE_REQUEST_OPTIONS);
        if (session.payment_status === "paid") {
          await fulfillPhotoOrderPaidSession(session);
          await redis.zrem(PHOTO_ORDER_CLEANUP_QUEUE, id); continue;
        }
        // Never assume that elapsed time proves the absence of a charge.
        if (session.status !== "expired" || session.payment_status !== "unpaid") throw new Error("CHECKOUT_UNRESOLVED");
        await expirePhotoOrderCheckout(order, session);
        order = (await getPhotoOrder(id))!;
      }
      if (!order) throw new Error("ORDER_MISSING");
      const claim = await redis.eval(CLAIM_PHOTO_ORDER_CLEANUP_SCRIPT, [photoOrderKey(id)], [new Date(now - DRAFT_RETENTION_MS).toISOString(), new Date(now).toISOString()]);
      if (claim !== "CLAIMED") throw new Error("CLEANUP_DEFERRED");
      await deleteFromR2(order.imageKey);
      await redis.zrem(PHOTO_ORDER_CLEANUP_QUEUE, id);
      result.deleted++;
    } catch {
      result.deferred++;
      // Bounded retries also keep one unresolved order from starving the queue.
      await redis.zadd(PHOTO_ORDER_CLEANUP_QUEUE, { score: now + 60 * 60 * 1000, member: id });
    }
  }
  return result;
}
