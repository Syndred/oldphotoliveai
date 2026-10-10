import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockToken = jest.fn();
const mockEval = jest.fn();
const mockGet = jest.fn();
const mockSend = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn();
const mockRetrieve = jest.fn();
const mockOwned = jest.fn();
const mockWake = jest.fn();
const mockZrange = jest.fn();
const mockZrem = jest.fn();
const mockZadd = jest.fn();
jest.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => mockToken(...args) }));
jest.mock("@/lib/config", () => ({ config: { stripe: { isEnabled: true, priceIds: {} }, r2: { bucketName: "photos" }, nextauth: { url: "https://oldphotoliveai.com" } } }));
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval, get: mockGet, zrange: mockZrange, zrem: mockZrem, zadd: mockZadd }), getUser: (id: string) => mockGet(`user:${id}`), getTask: (id: string) => mockGet(`task:${id}`) }));
jest.mock("@/lib/r2", () => ({ getS3Client: () => ({ send: mockSend }), deleteFromR2: (...args: unknown[]) => mockDelete(...args) }));
jest.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ checkout: { sessions: { create: mockCreate, retrieve: mockRetrieve } } }) }));
jest.mock("@/lib/upload-receipt", () => ({ isUploadOwned: (...args: unknown[]) => mockOwned(...args) }));
jest.mock("@/lib/worker-wakeup", () => ({ schedulePipelineWakeupForStatus: (...args: unknown[]) => mockWake(...args) }));
import { cleanupUnpaidPhotoOrders, PHOTO_ORDER_CLEANUP_QUEUE, CLAIM_PHOTO_ORDER_CLEANUP_SCRIPT, createPhotoOrder, getPhotoOrder, reservePhotoOrderCheckout, recoverPhotoOrderCheckoutSession, expirePhotoOrderCheckout, fulfillPhotoOrderPaidSession, type PhotoOrder } from "@/lib/photo-order";
import { fulfillPaidCheckout } from "@/lib/checkout-fulfillment";
import { POST as draft } from "@/app/api/photo-orders/route";
import { GET as read } from "@/app/api/photo-orders/[orderId]/route";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { GET as paymentStatus } from "@/app/api/stripe/checkout/status/route";
let redis: RedisLuaFixture;
let sessions: Record<string, Stripe.Checkout.Session>;
const draftInput = { userId: "buyer", imageKey: "tasks/source/original.jpg", workflow: "animate" as const, locale: "zh" };
const request = (path: string, body?: unknown) => new NextRequest(`https://oldphotoliveai.com/api/${path}`, body ? { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : undefined);
beforeEach(() => {
  jest.resetAllMocks(); redis = new RedisLuaFixture(); sessions = {};
  redis.setString("user:buyer", JSON.stringify({ id: "buyer", tier: "free" }));
  redis.setString("quota:buyer", JSON.stringify({ tier: "free", credits: 0, remaining: 0 }));
  mockZrange.mockImplementation(async (key, min, max) => redis.sortedMembers(key).filter((id) => redis.sortedScore(key, id)! <= max).slice(0, 3));
  mockZrem.mockImplementation(async (key, id) => redis.removeSorted(key, id));
  mockZadd.mockImplementation(async (key, item) => redis.addSorted(key, item.score, item.member));
  mockEval.mockImplementation((script, keys, args) => redis.eval(script, keys, args));
  mockGet.mockImplementation(async (key) => { const raw = redis.getString(key); if (!raw) return null; try { return JSON.parse(raw); } catch { return raw; } });
  mockToken.mockResolvedValue({ userId: "buyer", email: "private@example.com" }); mockOwned.mockResolvedValue(true);
  mockSend.mockResolvedValue({ ContentLength: 200 }); mockDelete.mockResolvedValue(undefined);
  mockCreate.mockImplementation(async (params, options) => {
    const existing = Object.values(sessions).find((session) => session.metadata?.attemptId === params.metadata.attemptId);
    if (existing) return existing;
    const id = `cs_test_${Object.keys(sessions).length + 1}`;
    return sessions[id] = { id, url: `https://checkout.stripe.com/${id}`, status: "open", payment_status: "unpaid", amount_total: 199, currency: "usd", client_reference_id: "buyer", metadata: params.metadata, payment_intent: `pi_${id}` } as Stripe.Checkout.Session;
  });
  mockRetrieve.mockImplementation(async (id) => sessions[id]);
});
async function setup() {
  const { order } = await createPhotoOrder(draftInput);
  const reserved = await reservePhotoOrderCheckout(order, "private@example.com");
  const session = await recoverPhotoOrderCheckoutSession(reserved);
  return { order: (await getPhotoOrder(order.id))!, session };
}
const paid = (session: Stripe.Checkout.Session) => ({ ...session, status: "complete", payment_status: "paid" } as Stripe.Checkout.Session);
it("copies the original before saving and deduplicates concurrent drafts without deleting the winner", async () => {
  const results = await Promise.all([createPhotoOrder(draftInput), createPhotoOrder(draftInput)]);
  expect(results.map((r) => r.order.id)).toEqual([results[0].order.id, results[0].order.id]);
  expect(results.filter((r) => r.created)).toHaveLength(1);
  const order = results[0].order;
  expect(order.imageKey).toMatch(/^tasks\/.+\/original.jpg$/);
  expect(order.sourceImageKey).toBe(draftInput.imageKey);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).not.toHaveBeenCalledWith(order.imageKey);
  expect(redis.getString(`task:${order.taskId}`)).toBeUndefined();
  const replay = await createPhotoOrder(draftInput);
  expect(replay.order.id).toBe(order.id); expect(mockSend).toHaveBeenCalledTimes(2);
});
it("does not delete the input when Redis draft persistence has an unknown result", async () => {
  mockEval.mockRejectedValueOnce(new Error("Redis timeout"));
  await expect(createPhotoOrder(draftInput)).rejects.toThrow("Redis timeout");
  expect(mockDelete).not.toHaveBeenCalled();
});
it("requires login, valid workflow and source ownership before storage or Stripe access", async () => {
  mockToken.mockResolvedValueOnce(null);
  expect((await draft(request("photo-orders", draftInput))).status).toBe(401);
  expect((await draft(request("photo-orders", { ...draftInput, workflow: "bogus" }))).status).toBe(400);
  mockOwned.mockResolvedValueOnce(false);
  expect((await draft(request("photo-orders", draftInput))).status).toBe(404);
  expect(mockSend).not.toHaveBeenCalled(); expect(mockCreate).not.toHaveBeenCalled();
});
it("checks the uploaded object and returns only the order references", async () => {
  const response = await draft(request("photo-orders", draftInput));
  expect(response.status).toBe(201);
  expect(Object.keys(await response.json()).sort()).toEqual(["orderId", "status", "taskId"]);
  expect(mockSend.mock.calls[0][0].constructor.name).toBe("HeadObjectCommand");
  expect(mockSend.mock.calls[1][0].constructor.name).toBe("CopyObjectCommand");
  mockSend.mockRejectedValueOnce({ name: "NotFound" });
  expect((await draft(request("photo-orders", { ...draftInput, imageKey: "tasks/missing/original.jpg" }))).status).toBe(404);
});
it("uses durable exact parameters and one idempotency key after a lost Stripe response", async () => {
  const { order } = await createPhotoOrder(draftInput);
  const reserved = await reservePhotoOrderCheckout(order, "private@example.com");
  mockCreate.mockRejectedValueOnce(new Error("connection reset"));
  await expect(recoverPhotoOrderCheckoutSession(reserved)).rejects.toThrow("connection reset");
  const second = await reservePhotoOrderCheckout(order, "changed@example.com");
  await recoverPhotoOrderCheckoutSession(second);
  expect(mockCreate.mock.calls[0]).toEqual(mockCreate.mock.calls[1]);
  const [params, options] = mockCreate.mock.calls[1];
  expect(options.idempotencyKey).toContain(order.id);
  expect(params.line_items[0].price_data).toMatchObject({ unit_amount: 199, currency: "usd" });
  expect(params.success_url).toBe(`https://oldphotoliveai.com/zh/pricing?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`);
  expect(params.cancel_url).toContain(`orderId=${order.id}`); expect(params.cancel_url).not.toContain("resume=");
  expect(params.expires_at).toBeUndefined();
});
it("creates one high-priority paid task, history, queue and receipt under racing paid confirmations", async () => {
  const { order, session } = await setup();
  const results = await Promise.all([fulfillPaidCheckout(paid(session)), fulfillPaidCheckout(paid(session)), fulfillPaidCheckout(paid(session))]);
  expect(results.filter(Boolean)).toHaveLength(1);
  const task = JSON.parse(redis.getString(`task:${order.taskId}`)!);
  expect(task).toMatchObject({ id: order.taskId, purchaseOrderId: order.id, userId: "buyer", workflow: "animate", originalImageKey: order.imageKey, priority: "high", generationTier: "pay_as_you_go", status: "pending" });
  expect(redis.sortedMembers("queue:tasks")).toEqual([order.taskId]);
  expect(redis.sortedMembers("user:buyer:tasks")).toEqual([order.taskId]);
  expect(JSON.parse(redis.getString("user:buyer")!).tier).toBe("free"); expect(JSON.parse(redis.getString("quota:buyer")!).credits).toBe(0);
  expect(await getPhotoOrder(order.id)).toMatchObject({ status: "paid", paidSessionId: session.id, paymentIntentId: session.payment_intent });
  const receipt = redis.getString(`stripe:checkout:receipt:${session.id}`)!;
  expect(JSON.parse(receipt)).toMatchObject({ fulfillmentKind: "photo_processing", creditsAdded: 0, orderId: order.id, taskId: order.taskId });
  expect(receipt).not.toContain("private@example.com");
  expect(redis.getHash(`conversion:${new Date().toISOString().slice(0, 10)}`)).toEqual({ purchases: 1, single_run_purchases: 1, revenue_minor_usd: 199 });
});
it("validates queue types before writes and safely recovers paid fulfillment after the fault is repaired", async () => {
  const { order, session } = await setup(); redis.setString("queue:tasks", "corrupt");
  await expect(fulfillPaidCheckout(paid(session))).rejects.toThrow("INVALID_QUEUE_OR_HISTORY");
  expect((await getPhotoOrder(order.id))!.status).toBe("unpaid");
  expect(redis.getString(`task:${order.taskId}`)).toBeUndefined(); expect(redis.getString(`stripe:checkout:receipt:${session.id}`)).toBeUndefined();
  await redis.eval("return redis.call('DEL', KEYS[1])", ["queue:tasks"], []);
  expect(await fulfillPaidCheckout(paid(session))).toBe(true);
});
it("rejects manipulated prices, ownership and unpaid sessions without creating work", async () => {
  const { order, session } = await setup();
  expect(await fulfillPhotoOrderPaidSession(session)).toBe(false);
  await expect(fulfillPhotoOrderPaidSession({ ...paid(session), amount_total: 1 })).rejects.toThrow("INVALID_PAID_PHOTO_ORDER");
  await expect(fulfillPhotoOrderPaidSession({ ...paid(session), client_reference_id: "attacker" })).rejects.toThrow("PAID_PHOTO_ORDER_MISMATCH");
  expect(redis.getString(`task:${order.taskId}`)).toBeUndefined();
});
it("only rotates an attempt after Stripe confirms expired and unpaid; a late old paid session is fenced", async () => {
  const { order, session } = await setup();
  await expect(expirePhotoOrderCheckout(order, session)).rejects.toThrow("CHECKOUT_NOT_CONFIRMED_EXPIRED");
  await expirePhotoOrderCheckout(order, { ...session, status: "expired" });
  const next = await reservePhotoOrderCheckout((await getPhotoOrder(order.id))!);
  expect(next.checkout!.attemptId).not.toBe(order.checkout!.attemptId);
  await expect(fulfillPhotoOrderPaidSession(paid(session))).rejects.toThrow("ATTEMPT_MISMATCH");
  const nextSession = await recoverPhotoOrderCheckoutSession(next);
  expect(await fulfillPhotoOrderPaidSession(paid(nextSession))).toBe(true);
  await expect(fulfillPhotoOrderPaidSession(paid(session))).rejects.toThrow("ORDER_ALREADY_PAID");
  expect(redis.sortedMembers("queue:tasks")).toHaveLength(1);
});
it("returns support review instead of silently replacing an unknown checkout beyond Stripe's idempotency window", async () => {
  const { order } = await createPhotoOrder(draftInput);
  const reserved = await reservePhotoOrderCheckout(order);
  reserved.checkout!.createdAt = "2020-01-01T00:00:00.000Z";
  redis.setString(`photo:order:${order.id}`, JSON.stringify(reserved));
  const response = await checkout(request("stripe/checkout", { plan: "single_run", orderId: order.id }));
  expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: "CHECKOUT_REVIEW_REQUIRED" });
  expect(mockCreate).not.toHaveBeenCalled();
});
it("resumes a paid checkout through status and exposes no source, payment intent, email or raw session", async () => {
  const { order, session } = await setup(); sessions[session.id] = paid(session);
  const response = await paymentStatus(request(`stripe/checkout/status?session_id=${session.id}`));
  expect(response.status).toBe(200);
  const data = await response.json(); expect(data).toMatchObject({ status: "fulfilled", fulfillmentKind: "photo_processing", orderId: order.id, taskId: order.taskId, creditsAdded: 0 });
  expect(data.transactionId).toMatch(/^[a-f0-9]{64}$/); expect(JSON.stringify(data)).not.toMatch(/pi_cs|cs_test|private@example|uploads\//);
  expect(mockWake).toHaveBeenCalledWith("pending");
});
it("order and checkout APIs hide another user's order and prevent new sales of legacy result unlocks", async () => {
  const { order } = await createPhotoOrder(draftInput);
  mockToken.mockResolvedValue({ userId: "attacker" });
  expect((await read(request(`photo-orders/${order.id}`), { params: Promise.resolve({ orderId: order.id }) })).status).toBe(404);
  expect((await checkout(request("stripe/checkout", { plan: "single_run", orderId: order.id }))).status).toBe(404);
  mockToken.mockResolvedValue({ userId: "buyer" });
  expect((await checkout(request("stripe/checkout", { plan: "single_photo", taskId: order.taskId }))).status).toBe(410);
  const response = await read(request(`photo-orders/${order.id}`), { params: Promise.resolve({ orderId: order.id }) });
  const body = await response.json(); expect(body).toMatchObject({ status: "unpaid", workflow: "animate", price: { amountTotal: 199, currency: "usd", displayPrice: "$1.99" } });
  expect(JSON.stringify(body)).not.toMatch(/imageKey|stripe|private@example|buyer/);
  expect(mockCreate).not.toHaveBeenCalled();
});
it("payment replays do not recreate deleted work or overwrite an order's refund state", async () => {
  const { order, session } = await setup(); await fulfillPhotoOrderPaidSession(paid(session));
  const current = (await getPhotoOrder(order.id))!;
  redis.setString(`photo:order:${order.id}`, JSON.stringify({ ...current, status: "refunded", refund: { status: "succeeded" } }));
  await redis.eval("return redis.call('DEL', KEYS[1])", [`task:${order.taskId}`], []);
  expect(await fulfillPhotoOrderPaidSession(paid(session))).toBe(false);
  expect(redis.getString(`task:${order.taskId}`)).toBeUndefined();
  expect((await getPhotoOrder(order.id))!.status).toBe("refunded");
});

async function ageOrder(order: PhotoOrder) {
  const old = { ...order, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() };
  redis.setString(`photo:order:${order.id}`, JSON.stringify(old));
  redis.addSorted(PHOTO_ORDER_CLEANUP_QUEUE, Date.now() - 86400000, order.id);
  return old;
}
it("cleans old unpaid sources only after atomically closing the order and retains a permanent tombstone", async () => {
  const { order } = await createPhotoOrder(draftInput); await ageOrder(order);
  expect(await cleanupUnpaidPhotoOrders()).toEqual({ checked: 1, deleted: 1, deferred: 0 });
  expect(mockDelete).toHaveBeenCalledWith(order.imageKey);
  expect((await getPhotoOrder(order.id))!.status).toBe("expired");
  expect((await createPhotoOrder(draftInput)).order.id).toBe(order.id);
  await expect(reservePhotoOrderCheckout(order)).rejects.toThrow();
  expect(redis.sortedMembers(PHOTO_ORDER_CLEANUP_QUEUE)).toEqual([]);
});
it("keeps unknown, open and paid Stripe orders out of unpaid source deletion", async () => {
  const { order, session } = await setup(); await ageOrder(order);
  expect((await cleanupUnpaidPhotoOrders()).deferred).toBe(1); expect(mockDelete).not.toHaveBeenCalled();
  const unknown = (await getPhotoOrder(order.id))!; delete unknown.checkout!.sessionId; await ageOrder(unknown);
  mockRetrieve.mockClear(); expect((await cleanupUnpaidPhotoOrders()).deferred).toBe(1);
  expect(mockRetrieve).not.toHaveBeenCalled(); expect(mockDelete).not.toHaveBeenCalled();
  unknown.checkout!.sessionId = session.id; await ageOrder(unknown); sessions[session.id] = paid(session);
  expect((await cleanupUnpaidPhotoOrders()).deleted).toBe(0);
  expect((await getPhotoOrder(order.id))!.status).toBe("paid"); expect(mockDelete).not.toHaveBeenCalled();
});
it("can recover an interrupted source cleanup and handles only Stripe-confirmed expired unpaid sessions", async () => {
  const { order, session } = await setup(); await ageOrder(order); sessions[session.id] = { ...session, status: "expired" };
  mockDelete.mockRejectedValueOnce(new Error("R2 unavailable"));
  expect((await cleanupUnpaidPhotoOrders()).deferred).toBe(1);
  expect((await getPhotoOrder(order.id))!.status).toBe("expired");
  redis.addSorted(PHOTO_ORDER_CLEANUP_QUEUE, Date.now() - 1, order.id);
  expect((await cleanupUnpaidPhotoOrders()).deleted).toBe(1);
  expect(mockDelete).toHaveBeenCalledTimes(2); expect(mockCreate).toHaveBeenCalledTimes(1);
});
it("serializes draft expiration against a concurrent checkout reservation", async () => {
  const { order } = await createPhotoOrder(draftInput); const aged = await ageOrder(order);
  await reservePhotoOrderCheckout(aged);
  const claimed = await redis.eval(CLAIM_PHOTO_ORDER_CLEANUP_SCRIPT, [`photo:order:${order.id}`], [new Date().toISOString(), new Date().toISOString()]);
  expect(claimed).toBe("CHECKOUT_PENDING"); expect((await getPhotoOrder(order.id))!.status).toBe("unpaid");
});
it("rejects null or malformed checkout JSON as client input without contacting Stripe", async () => {
  for (const body of ["null", "{", "[]"]) {
    const response = await checkout(new NextRequest("https://oldphotoliveai.com/api/stripe/checkout", { method: "POST", body, headers: { "Content-Type": "application/json" } }));
    expect(response.status).toBe(400);
  }
  expect(mockCreate).not.toHaveBeenCalled();
});
