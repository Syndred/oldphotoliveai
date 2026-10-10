import { checkoutContext, safeCheckoutReturnTo, pricingCheckoutPath } from "@/lib/checkout-context";
it("preserves known tool routes and chooses their maintained public language", () => {
  expect(safeCheckoutReturnTo("/restore-old-photos", "zh")).toBe("/restore-old-photos");
  expect(safeCheckoutReturnTo("/es/animate", "ja")).toBe("/animate");
  expect(safeCheckoutReturnTo("/colorize-old-photos", "zh")).toBe("/zh/colorize-old-photos");
});
it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/admin", "/api/stripe/portal", "/animate?redirect=https://evil.test", "/restore-old-photos/../admin"])("rejects unsafe returnTo %s", (value) => {
  expect(safeCheckoutReturnTo(value, "en")).toBeUndefined();
});
it("preserves a safe task and rejects injected task IDs", () => {
  expect(checkoutContext(new URLSearchParams("taskId=photo-123&returnTo=/animate"), "zh")).toEqual({ taskId: "photo-123", returnTo: "/animate" });
  expect(checkoutContext(new URLSearchParams("taskId=../../admin"), "en").taskId).toBeUndefined();
});

it("returns legacy Japanese and Spanish checkouts straight to English pricing with order context", () => {
  expect(pricingCheckoutPath("ja", { orderId: "order-123" }, { session_id: "cs_return" })).toBe("/pricing?session_id=cs_return&orderId=order-123");
  expect(pricingCheckoutPath("es", { taskId: "task-123" })).toBe("/pricing?taskId=task-123");
});
it("constructs a localized sign-in continuation with only explicit resume intent", () => {
  expect(pricingCheckoutPath("zh", { taskId: "photo-123" }, { plan: "starter_pack", resume: "1" })).toBe("/zh/pricing?plan=starter_pack&resume=1&taskId=photo-123");
});

it.each(["/", "/restore-old-photos", "/colorize-old-photos", "/repair-damaged-old-photos", "/animate", "/animate-free", "/bring-to-life", "/to-video", "/no-login"])("preserves the actual upload page %s", (path) => {
  expect(safeCheckoutReturnTo(path, "en")).toBe(path);
});
