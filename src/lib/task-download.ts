import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { getRedisClient } from "@/lib/redis";
import { getStripeClient } from "@/lib/stripe";
import { headPrivateObjectFromR2 } from "@/lib/r2";
import { SUPPORT_EMAIL } from "@/lib/site";
import type { Task } from "@/types";

export interface TaskDownloadGrant {
  userId: string;
  taskId: string;
  scope: "result";
  source: "single_photo" | "credit" | "professional";
  grantedAt: string;
  creditsDebited: 0 | 1;
  checkoutSessionId?: string;
}
export interface PendingTaskDownloadCheckout {
  userId: string;
  taskId: string;
  ownerUserId: string;
  orderId: string;
  createdAt: string;
  sessionId?: string;
  params: Stripe.Checkout.SessionCreateParams;
}
export const taskDownloadGrantKey = (taskId: string) => `download:grant:${taskId}`;
export const taskDownloadPendingKey = (taskId: string) => `download:pending:${taskId}`;
export const taskDownloadDeletingKey = (taskId: string) => `download:deleting:${taskId}`;
function parseRecord<T>(raw: unknown): T | null {
  return raw == null ? null : typeof raw === "string" ? JSON.parse(raw) as T : raw as T;
}
export async function getTaskDownloadGrant(taskId: string): Promise<TaskDownloadGrant | null> {
  return parseRecord<TaskDownloadGrant>(await getRedisClient().get(taskDownloadGrantKey(taskId)));
}
export async function hasTaskDownloadAccess(taskId: string, userId: string): Promise<boolean> {
  const grant = await getTaskDownloadGrant(taskId);
  return grant?.userId === userId && grant.taskId === taskId && grant.scope === "result";
}
export async function getPendingTaskDownloadCheckout(taskId: string): Promise<PendingTaskDownloadCheckout | null> {
  return parseRecord<PendingTaskDownloadCheckout>(await getRedisClient().get(taskDownloadPendingKey(taskId)));
}

export function isTaskDownloadEligible(task: Task): boolean {
  const tier = task.generationTier ?? (task.priority === "urgent" ? "professional" : task.priority === "high" ? "pay_as_you_go" : "free");
  if (tier !== "free") return false;
  if (task.status !== "completed" || task.violation || task.downloadPolicy !== "preview_v1") return false;
  const assets = task.masterAssets;
  const workflow = task.workflow ?? "full";
  return Boolean(assets?.restored &&
    (!(workflow === "colorize" || workflow === "full") || assets.colorized) &&
    (!(workflow === "animate" || workflow === "full") || assets.animation));
}

/** Metadata does not prove the underlying object survived a partial deletion. */
export async function assertTaskDownloadMastersAvailable(task: Task): Promise<void> {
  if (!isTaskDownloadEligible(task)) throw new Error("RESULT_UNAVAILABLE");
  const keys = [...new Set(Object.values(task.masterAssets ?? {}).filter((key): key is string => Boolean(key)))];
  await Promise.all(keys.map(async (key) => {
    const object = await headPrivateObjectFromR2(key);
    if (!object.ContentLength || object.ContentLength <= 0) throw new Error("RESULT_UNAVAILABLE");
  }));
}

export class TaskCheckoutReviewRequiredError extends Error {
  readonly code = "CHECKOUT_REVIEW_REQUIRED";
  constructor() {
    super("CHECKOUT_REVIEW_REQUIRED");
    this.name = "TaskCheckoutReviewRequiredError";
  }
}
export function getTaskCheckoutReviewResponse(locale: string) {
  const messages: Record<string, string> = {
    en: `We could not safely confirm this checkout. Contact ${SUPPORT_EMAIL} before trying another payment for this result.`,
    zh: `暂时无法安全确认这笔付款，请联系 ${SUPPORT_EMAIL} 核对，再尝试为此结果付款。`,
    es: `No podemos confirmar este pago con seguridad. Contacta con ${SUPPORT_EMAIL} antes de intentar otro pago por este resultado.`,
    ja: `このお支払いを安全に確認できません。この結果について再度お支払いする前に、${SUPPORT_EMAIL} へお問い合わせください。`,
  };
  return { code: "CHECKOUT_REVIEW_REQUIRED", error: messages[locale] ?? messages.en, supportEmail: SUPPORT_EMAIL, creditsDebited: 0 };
}

export async function recoverTaskDownloadCheckoutSession(pending: PendingTaskDownloadCheckout): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  if (pending.sessionId) return stripe.checkout.sessions.retrieve(pending.sessionId);
  // Stripe may prune idempotency keys after 24 hours. Never risk creating a new
  // payment if an old create response was lost and can no longer be replayed.
  const createdAt = Date.parse(pending.createdAt);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt >= 23 * 60 * 60 * 1000) throw new TaskCheckoutReviewRequiredError();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(pending.params, { idempotencyKey: `single-result:${pending.orderId}` });
  } catch (error) {
    // Fixed original parameters are essential to Stripe idempotency. If Stripe
    // rejects the old expiry, changing it or changing the key risks another charge.
    const failure = error as { type?: string; statusCode?: number; param?: string; raw?: { param?: string; type?: string } };
    const invalidRequest = failure?.type === "StripeInvalidRequestError" || failure?.raw?.type === "invalid_request_error";
    if ((invalidRequest && (failure.param ?? failure.raw?.param) === "expires_at") || failure?.type === "StripeIdempotencyError") {
      throw new TaskCheckoutReviewRequiredError();
    }
    throw error;
  }
  await saveTaskDownloadCheckoutSession(pending, session.id);
  return session;
}

// Shared within scripts so eligibility is rechecked at the same instant as a debit/reservation.
export const DOWNLOAD_ELIGIBILITY_LUA = `
local function eligible(task)
  local tier = task.generationTier or (task.priority == 'urgent' and 'professional' or (task.priority == 'high' and 'pay_as_you_go' or 'free'))
  if tier ~= 'free' then return false end
  if task.status ~= 'completed' or task.violation == true or task.downloadPolicy ~= 'preview_v1' then return false end
  local assets = task.masterAssets
  if type(assets) ~= 'table' or type(assets.restored) ~= 'string' or assets.restored == '' then return false end
  local workflow = task.workflow or 'full'
  if (workflow == 'colorize' or workflow == 'full') and (type(assets.colorized) ~= 'string' or assets.colorized == '') then return false end
  if (workflow == 'animate' or workflow == 'full') and (type(assets.animation) ~= 'string' or assets.animation == '') then return false end
  return true
end
local function stringKey(key)
  local kind = redis.call('TYPE', key).ok
  return kind == 'none' or kind == 'string'
end
`;

export const RESERVE_DOWNLOAD_CHECKOUT_SCRIPT = DOWNLOAD_ELIGIBILITY_LUA + `
for i = 1, 4 do if not stringKey(KEYS[i]) then return {'ERROR', 'INVALID_KEY'} end end
if redis.call('EXISTS', KEYS[4]) == 1 then return {'REJECTED', 'TASK_DELETING'} end
local raw = redis.call('GET', KEYS[1])
if not raw then return {'REJECTED', 'TASK_NOT_FOUND'} end
local task = cjson.decode(raw)
local pending = cjson.decode(ARGV[1])
if task.userId ~= pending.ownerUserId or not eligible(task) then return {'REJECTED', 'RESULT_UNAVAILABLE'} end
local grantRaw = redis.call('GET', KEYS[2])
if grantRaw then
  local grant = cjson.decode(grantRaw)
  return {'REJECTED', grant.userId == pending.userId and 'ALREADY_UNLOCKED' or 'TASK_ALREADY_CLAIMED'}
end
local previous = redis.call('GET', KEYS[3])
if previous then
  if cjson.decode(previous).userId ~= pending.userId then return {'REJECTED', 'CHECKOUT_PENDING'} end
  return {'EXISTING', previous}
end
redis.call('SET', KEYS[3], ARGV[1])
return {'RESERVED', ARGV[1]}
`;
export async function reserveTaskDownloadCheckout(input: Omit<PendingTaskDownloadCheckout, "orderId" | "createdAt" | "sessionId">): Promise<{ outcome: "reserved" | "existing"; pending: PendingTaskDownloadCheckout } | { outcome: "rejected"; code: string }> {
  const pending: PendingTaskDownloadCheckout = { ...input, orderId: randomUUID(), createdAt: new Date().toISOString() };
  // Persist exact params before calling Stripe, so every retry has identical idempotent input.
  pending.params.metadata = { ...pending.params.metadata, orderId: pending.orderId };
  const result = await getRedisClient().eval(RESERVE_DOWNLOAD_CHECKOUT_SCRIPT,
    [`task:${input.taskId}`, taskDownloadGrantKey(input.taskId), taskDownloadPendingKey(input.taskId), taskDownloadDeletingKey(input.taskId)], [JSON.stringify(pending)]) as unknown[];
  if (result[0] === "RESERVED" || result[0] === "EXISTING") return { outcome: result[0] === "RESERVED" ? "reserved" : "existing", pending: parseRecord<PendingTaskDownloadCheckout>(result[1])! };
  return { outcome: "rejected", code: String(result[1] ?? "INTERNAL_ERROR") };
}
export const UPDATE_DOWNLOAD_CHECKOUT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'MISSING' end
local pending = cjson.decode(raw)
if pending.orderId ~= ARGV[1] then return 'STALE' end
if ARGV[2] == 'release' then redis.call('DEL', KEYS[1]); return 'RELEASED' end
pending.sessionId = ARGV[2]
redis.call('SET', KEYS[1], cjson.encode(pending))
return 'SAVED'
`;
export async function saveTaskDownloadCheckoutSession(pending: PendingTaskDownloadCheckout, sessionId: string): Promise<void> {
  await getRedisClient().eval(UPDATE_DOWNLOAD_CHECKOUT_SCRIPT, [taskDownloadPendingKey(pending.taskId)], [pending.orderId, sessionId]);
}
/** Call only after Stripe confirms status=expired and payment_status=unpaid. */
export async function releaseExpiredTaskDownloadCheckout(pending: PendingTaskDownloadCheckout): Promise<void> {
  await getRedisClient().eval(UPDATE_DOWNLOAD_CHECKOUT_SCRIPT, [taskDownloadPendingKey(pending.taskId)], [pending.orderId, "release"]);
}

export const UNLOCK_TASK_DOWNLOAD_SCRIPT = DOWNLOAD_ELIGIBILITY_LUA + `
for i = 1, 6 do if not stringKey(KEYS[i]) then return {'ERROR', 'INVALID_KEY'} end end
local historyType = redis.call('TYPE', KEYS[7]).ok
if historyType ~= 'none' and historyType ~= 'zset' then return {'ERROR', 'INVALID_HISTORY'} end
if redis.call('EXISTS', KEYS[6]) == 1 then return {'REJECTED', 'TASK_DELETING'} end
local taskRaw = redis.call('GET', KEYS[1])
if not taskRaw then return {'REJECTED', 'TASK_NOT_FOUND'} end
local task = cjson.decode(taskRaw)
if task.userId ~= ARGV[2] then return {'REJECTED', 'TASK_NOT_FOUND'} end
local existing = redis.call('GET', KEYS[4])
if existing then
  if cjson.decode(existing).userId ~= ARGV[1] then return {'REJECTED', 'TASK_ALREADY_CLAIMED'} end
  return {'EXISTING', existing}
end
local generationTier = task.generationTier or (task.priority == 'urgent' and 'professional' or (task.priority == 'high' and 'pay_as_you_go' or 'free'))
if generationTier ~= 'free' then return {'INCLUDED', ''} end
if not eligible(task) then return {'REJECTED', 'RESULT_UNAVAILABLE'} end
if redis.call('EXISTS', KEYS[5]) == 1 then return {'REJECTED', 'CHECKOUT_PENDING'} end
local userRaw = redis.call('GET', KEYS[3])
if not userRaw then return {'REJECTED', 'UNAUTHORIZED'} end
local user = cjson.decode(userRaw)
local grant = {userId=ARGV[1],taskId=task.id,scope='result',source='professional',creditsDebited=0,grantedAt=ARGV[3]}
local quota = nil
if user.tier ~= 'professional' then
  local quotaRaw = redis.call('GET', KEYS[2])
  if not quotaRaw then return {'REJECTED', 'NO_CREDITS'} end
  quota = cjson.decode(quotaRaw)
  if type(quota.creditsExpireAt) == 'string' and quota.creditsExpireAt < ARGV[3] then return {'REJECTED', 'CREDITS_EXPIRED'} end
  if (tonumber(quota.credits) or 0) < 1 then return {'REJECTED', 'NO_CREDITS'} end
  quota.credits = quota.credits - 1
  grant.source = 'credit'
  grant.creditsDebited = 1
end
local encoded = cjson.encode(grant)
local quotaEncoded = quota and cjson.encode(quota) or nil
if quotaEncoded then redis.call('SET', KEYS[2], quotaEncoded) end
redis.call('SET', KEYS[4], encoded)
redis.call('ZADD', KEYS[7], ARGV[4], task.id)
local metricType = redis.call('TYPE', KEYS[8]).ok
if metricType == 'none' or metricType == 'hash' then
  redis.pcall('HINCRBY', KEYS[8], grant.source == 'credit' and 'credit_unlocks' or 'professional_unlocks', 1)
  redis.pcall('EXPIRE', KEYS[8], 34560000)
end
return {'GRANTED', encoded}
`;
export async function unlockTaskDownload(input: { userId: string; taskId: string; ownerUserId: string }) {
  const now = new Date();
  const result = await getRedisClient().eval(UNLOCK_TASK_DOWNLOAD_SCRIPT,
    [`task:${input.taskId}`, `quota:${input.userId}`, `user:${input.userId}`, taskDownloadGrantKey(input.taskId), taskDownloadPendingKey(input.taskId), taskDownloadDeletingKey(input.taskId), `user:${input.userId}:tasks`, `conversion:${now.toISOString().slice(0, 10)}`],
    [input.userId, input.ownerUserId, now.toISOString(), String(now.getTime())]) as unknown[];
  return { outcome: String(result[0]), code: result[0] === "REJECTED" || result[0] === "ERROR" ? String(result[1]) : undefined, grant: result[0] === "GRANTED" || result[0] === "EXISTING" ? parseRecord<TaskDownloadGrant>(result[1]) : undefined };
}

export const BEGIN_DOWNLOAD_DELETION_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
if redis.call('EXISTS', KEYS[2]) == 1 then return 1 end
redis.call('SET', KEYS[2], ARGV[1])
return 1
`;
/** A persistent deletion guard is intentional: a crash must not reopen checkout for partially deleted files. */
export async function beginTaskDownloadDeletion(taskId: string): Promise<boolean> {
  const pending = await getPendingTaskDownloadCheckout(taskId);
  if (pending?.sessionId) {
    try {
      const session = await getStripeClient().checkout.sessions.retrieve(pending.sessionId);
      if (session.status === "expired" && session.payment_status === "unpaid") await releaseExpiredTaskDownloadCheckout(pending);
    } catch { return false; }
  }
  return Number(await getRedisClient().eval(BEGIN_DOWNLOAD_DELETION_SCRIPT,
    [taskDownloadPendingKey(taskId), taskDownloadDeletingKey(taskId)], [new Date().toISOString()])) === 1;
}
/** Release after success, or after a failure only when all task assets are still intact. */
export async function releaseTaskDownloadDeletion(taskId: string): Promise<void> {
  await getRedisClient().del(taskDownloadDeletingKey(taskId));
}
