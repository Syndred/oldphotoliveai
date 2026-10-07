import { checkoutContext, safeCheckoutReturnTo, pricingCheckoutPath } from "@/lib/checkout-context";
it("preserves only known tool routes and localizes them", () => {
  expect(safeCheckoutReturnTo("/restore-old-photos", "zh")).toBe("/zh/restore-old-photos");
  expect(safeCheckoutReturnTo("/es/animate", "ja")).toBe("/ja/animate");
});
it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/admin", "/api/stripe/portal", "/animate?redirect=https://evil.test", "/restore-old-photos/../admin"])("rejects unsafe returnTo %s", (value) => {
  expect(safeCheckoutReturnTo(value, "en")).toBeUndefined();
});
it("preserves a safe task and rejects injected task IDs", () => {
  expect(checkoutContext(new URLSearchParams("taskId=photo-123&returnTo=/animate"), "zh")).toEqual({ taskId: "photo-123", returnTo: "/zh/animate" });
  expect(checkoutContext(new URLSearchParams("taskId=../../admin"), "en").taskId).toBeUndefined();
});
it("constructs a localized sign-in continuation with only explicit resume intent", () => {
  expect(pricingCheckoutPath("zh", { taskId: "photo-123" }, { plan: "starter_pack", resume: "1" })).toBe("/zh/pricing?plan=starter_pack&resume=1&taskId=photo-123");
});

it.each(["/", "/restore-old-photos", "/colorize-old-photos", "/repair-damaged-old-photos", "/animate", "/animate-free", "/bring-to-life", "/to-video", "/no-login"])("preserves the actual upload page %s", (path) => {
  expect(safeCheckoutReturnTo(path, "en")).toBe(path);
});
