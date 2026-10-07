/** @jest-environment jsdom */
import { trackVerifiedPurchase } from "@/lib/analytics";
const receipt = { transactionId: "a".repeat(64), plan: "starter_pack", amountTotal: 499, currency: "usd", creditsAdded: 10 };
beforeEach(() => { process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST"; localStorage.clear(); window.gtag = jest.fn(); });
it("sends the exact verified amount once with only an opaque transaction id", () => {
  trackVerifiedPurchase(receipt);
  trackVerifiedPurchase(receipt);
  expect(window.gtag).toHaveBeenCalledTimes(1);
  expect(window.gtag).toHaveBeenCalledWith("event", "purchase", { transaction_id: receipt.transactionId, currency: "USD", value: 4.99, plan: "starter_pack" });
});
it("queues the verified purchase until GA is ready and rejects raw session identifiers", () => {
  window.gtag = undefined;
  trackVerifiedPurchase({ ...receipt, transactionId: "b".repeat(64) });
  trackVerifiedPurchase({ ...receipt, transactionId: "cs_live_private" });
  window.gtag = jest.fn();
  window.dispatchEvent(new Event("opla-ga-ready"));
  expect(window.gtag).toHaveBeenCalledTimes(1);
  expect(JSON.stringify((window.gtag as jest.Mock).mock.calls)).not.toContain("cs_live_");
});
