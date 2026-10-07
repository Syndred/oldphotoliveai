import { NextRequest } from "next/server";
const mockToken = jest.fn();
const mockRetrieve = jest.fn();
const mockReceipt = jest.fn();
jest.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => mockToken(...args) }));
jest.mock("@/lib/config", () => ({ config: { stripe: { isEnabled: true } } }));
jest.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ checkout: { sessions: { retrieve: (...args: unknown[]) => mockRetrieve(...args) } } }) }));
jest.mock("@/lib/checkout-fulfillment", () => ({ getCheckoutReceipt: (...args: unknown[]) => mockReceipt(...args) }));
import { GET } from "@/app/api/stripe/checkout/status/route";
const request = () => new NextRequest("http://localhost/api/stripe/checkout/status?session_id=cs_test_paid");
beforeEach(() => {
  jest.resetAllMocks();
  mockToken.mockResolvedValue({ userId: "u1" });
  mockRetrieve.mockResolvedValue({ payment_status: "paid", metadata: { userId: "u1", product: "oldphotoliveai", plan: "starter_pack" }, client_reference_id: "u1" });
});
it("requires a logged-in owner and never exposes another customer's checkout", async () => {
  mockToken.mockResolvedValueOnce(null);
  expect((await GET(request())).status).toBe(401);
  mockToken.mockResolvedValueOnce({ userId: "u2" });
  expect((await GET(request())).status).toBe(404);
  expect(mockReceipt).not.toHaveBeenCalled();
});
it("rejects checkout sessions from other projects", async () => {
  mockRetrieve.mockResolvedValue({ payment_status: "paid", metadata: { userId: "u1", product: "other" } });
  expect((await GET(request())).status).toBe(404);
});
it("does not call a paid Stripe session fulfilled until the durable credit receipt exists", async () => {
  mockReceipt.mockResolvedValue(null);
  expect(await (await GET(request())).json()).toEqual({ status: "processing" });
  mockRetrieve.mockResolvedValue({ payment_status: "unpaid", metadata: { userId: "u1", product: "oldphotoliveai" } });
  expect(await (await GET(request())).json()).toEqual({ status: "pending" });
});
it("returns confirmed purchase data without user identity or raw session id", async () => {
  mockReceipt.mockResolvedValue({ userId: "u1", transactionId: "cs_test_paid", plan: "starter_pack", amountTotal: 499, currency: "usd", creditsAdded: 10, taskId: "photo1" });
  const response = await GET(request());
  const result = await response.json();
  expect(result).toMatchObject({ status: "fulfilled", creditsAdded: 10, taskId: "photo1" });
  expect(result.transactionId).toMatch(/^[a-f0-9]{64}$/);
  expect(result.userId).toBeUndefined();
  expect(response.headers.get("cache-control")).toBe("no-store");
});
