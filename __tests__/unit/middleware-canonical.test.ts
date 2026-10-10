jest.mock("next-intl/middleware", () => ({
  __esModule: true,
  default: () => jest.fn(),
}));
jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
jest.mock("@/lib/rateLimit", () => ({ checkRateLimit: jest.fn() }));

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { config, middleware } from "@/middleware";

describe("middleware canonical path enforcement", () => {
  it.each([
    ["/en", "/"],
    ["/en/colorize/", "/colorize-old-photos"],
    ["/pricing/", "/pricing"],
    ["/zh/pricing/", "/zh/pricing"],
    ["/zh/colorize-old-photos/", "/zh/colorize-old-photos"],
    ["/zh/", "/zh"],
    ["/colorize-old-photos/", "/colorize-old-photos"],
    ["/zh/result/task-123/", "/zh/result/task-123"],
    ["/zh/history/", "/zh/history"],
    ["/zh/login/", "/zh/login"],
    ["/zh/admin/", "/zh/admin"],
    ["/en/colorize", "/colorize-old-photos"],
    ["/en/colorize-old-photos", "/colorize-old-photos"],
    ["/en/pricing", "/pricing"],
    ["/es/result/task-123", "/result/task-123"],
  ])("does not let a client-supplied intl header bypass %s normalization", async (from, to) => {
    const request = new NextRequest(`https://oldphotoliveai.com${from}?orderId=ord-123&session_id=cs-proof`, {
      headers: { "x-next-intl-locale": "en" },
    });
    const response = await middleware(request);
    expect(response?.status).toBe(301);
    const location = new URL(response!.headers.get("location")!);
    expect(location.pathname).toBe(to);
    expect(location.search).toBe("?orderId=ord-123&session_id=cs-proof");
  });
  it.each(["/api/quota/", "/api/tasks/task-123/status/", "/brand-icon.png/", "/favicon.ico/", "/sitemap.xml/", "/_next/static/chunks/example.js/"])("retains the previous 308 behavior for %s", async path => {
    const response = await middleware(new NextRequest(`https://oldphotoliveai.com${path}?orderId=proof`));
    expect(response?.status).toBe(308);
    const location = new URL(response!.headers.get("location")!);
    expect(location.pathname).toBe(path.slice(0, -1));
    expect(location.search).toBe("?orderId=proof");
  });

  it.each(["/api/quota", "/api/tasks", "/api/photo-orders", "/api/stripe/checkout"])("keeps authentication on ordinary %s", async path => {
    (getToken as jest.Mock).mockResolvedValueOnce(null);
    const response = await middleware(new NextRequest(`https://oldphotoliveai.com${path}`, { method: "POST", headers: { "x-next-intl-locale": "en" } }));
    expect(response?.status).toBe(401);
    expect(response?.headers.get("location")).toBeNull();
  });

  it("keeps ordinary excluded static requests outside middleware", () => {
    for (const path of ["/favicon.ico", "/brand-icon.png", "/_next/static/chunks/example.js"]) {
      expect(config.matcher.some(source => getPathMatch(source, { strict: true })(path))).toBe(false);
    }
  });

});
