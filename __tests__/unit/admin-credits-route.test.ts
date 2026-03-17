import { NextRequest } from "next/server";
import type { QuotaInfo, User } from "@/types";

const mockGetUser = jest.fn<Promise<User | null>, [string]>();
const mockGetUserByEmail = jest.fn<Promise<User | null>, [string]>();
const mockAddCredits = jest.fn<Promise<void>, [string, number, number]>();
const mockClearCredits = jest.fn<Promise<void>, [string]>();
const mockGetQuotaInfo = jest.fn<Promise<QuotaInfo>, [string]>();

jest.mock("@/lib/redis", () => ({
  getUser: (...args: unknown[]) => mockGetUser(args[0] as string),
  getUserByEmail: (...args: unknown[]) =>
    mockGetUserByEmail(args[0] as string),
}));

jest.mock("@/lib/quota", () => ({
  addCredits: (...args: unknown[]) =>
    mockAddCredits(args[0] as string, args[1] as number, args[2] as number),
  clearCredits: (...args: unknown[]) => mockClearCredits(args[0] as string),
  getQuotaInfo: (...args: unknown[]) => mockGetQuotaInfo(args[0] as string),
}));

import { DELETE, POST } from "@/app/api/internal/admin/credits/route";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-001",
    googleId: "google-001",
    email: "owner@example.com",
    name: "Owner",
    avatarUrl: null,
    tier: "pay_as_you_go",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    ...overrides,
  };
}

function makeQuota(overrides: Partial<QuotaInfo> = {}): QuotaInfo {
  return {
    userId: "user-001",
    tier: "pay_as_you_go",
    remaining: 5,
    dailyLimit: null,
    resetAt: null,
    credits: 5,
    creditsExpireAt: "2026-04-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("admin credits route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = "test-admin-key";
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
  });

  it("grants pay-as-you-go credits", async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockAddCredits.mockResolvedValue();
    mockGetQuotaInfo.mockResolvedValue(makeQuota());

    const request = new NextRequest(
      "http://localhost/api/internal/admin/credits",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-admin-key",
        },
        body: JSON.stringify({
          userId: "user-001",
          credits: 5,
          expirationDays: 30,
        }),
      }
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAddCredits).toHaveBeenCalledWith("user-001", 5, 30);
    expect(body.grantedCredits).toBe(5);
    expect(body.quota.credits).toBe(5);
  });

  it("clears pay-as-you-go credits", async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockClearCredits.mockResolvedValue();
    mockGetQuotaInfo.mockResolvedValue(makeQuota({ credits: 0 }));

    const request = new NextRequest(
      "http://localhost/api/internal/admin/credits",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-admin-key",
        },
        body: JSON.stringify({
          userId: "user-001",
        }),
      }
    );

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockClearCredits).toHaveBeenCalledWith("user-001");
    expect(body.updated).toBe(true);
  });
});
