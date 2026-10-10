jest.mock("next-intl/middleware", () => ({
  __esModule: true,
  default: () => jest.fn(),
}));
jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
jest.mock("@/lib/rateLimit", () => ({ checkRateLimit: jest.fn() }));

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("middleware canonical path enforcement", () => {
  it.each([
    ["/en", "/"],
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
});
