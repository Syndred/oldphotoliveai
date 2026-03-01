import { GET } from "@/app/api/quota/route";
import { NextRequest } from "next/server";
import type { QuotaInfo, User } from "@/types";

const mockGetToken = jest.fn();
const mockGetQuotaInfo = jest.fn<Promise<QuotaInfo>, [string]>();
const mockGetUser = jest.fn<Promise<User | null>, [string]>();

jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

jest.mock("@/lib/quota", () => ({
  getQuotaInfo: (...args: unknown[]) => mockGetQuotaInfo(args[0] as string),
}));

jest.mock("@/lib/redis", () => ({
  getUser: (...args: unknown[]) => mockGetUser(args[0] as string),
}));

function createRequest(): NextRequest {
  return new NextRequest("http://localhost/api/quota", { method: "GET" });
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    googleId: "g1",
    email: "u1@example.com",
    name: "U1",
    avatarUrl: null,
    tier: "free",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeQuota(overrides: Partial<QuotaInfo> = {}): QuotaInfo {
  return {
    userId: "u1",
    tier: "free",
    remaining: 0,
    dailyLimit: 1,
    resetAt: new Date().toISOString(),
    credits: 0,
    creditsExpireAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue({ userId: "u1" });
  mockGetUser.mockResolvedValue(makeUser());
  mockGetQuotaInfo.mockResolvedValue(makeQuota());
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/quota", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetToken.mockResolvedValue(null);

    const res = await GET(createRequest());

    expect(res.status).toBe(401);
  });

  it("returns 404 when user is missing", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await GET(createRequest());

    expect(res.status).toBe(404);
  });

  it("keeps free tier quota as-is", async () => {
    mockGetUser.mockResolvedValue(makeUser({ tier: "free" }));
    mockGetQuotaInfo.mockResolvedValue(
      makeQuota({
        tier: "free",
        remaining: 1,
        dailyLimit: 1,
      })
    );

    const res = await GET(createRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe("free");
    expect(body.remaining).toBe(1);
    expect(body.dailyLimit).toBe(1);
  });

  it("normalizes stale pay_as_you_go quota from user tier", async () => {
    mockGetUser.mockResolvedValue(makeUser({ tier: "pay_as_you_go" }));
    mockGetQuotaInfo.mockResolvedValue(
      makeQuota({
        tier: "free",
        remaining: 0,
        dailyLimit: 1,
        resetAt: new Date().toISOString(),
        credits: 3,
      })
    );

    const res = await GET(createRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe("pay_as_you_go");
    expect(body.remaining).toBe(3);
    expect(body.dailyLimit).toBeNull();
    expect(body.resetAt).toBeNull();
  });

  it("normalizes professional tier quota from user tier", async () => {
    mockGetUser.mockResolvedValue(makeUser({ tier: "professional" }));
    mockGetQuotaInfo.mockResolvedValue(
      makeQuota({
        tier: "free",
        remaining: 0,
        dailyLimit: 1,
        resetAt: new Date().toISOString(),
      })
    );

    const res = await GET(createRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe("professional");
    expect(body.dailyLimit).toBeNull();
    expect(body.resetAt).toBeNull();
  });
});
