import { NextRequest } from "next/server";
import type { QuotaInfo, User } from "@/types";

const mockGetUser = jest.fn<Promise<User | null>, [string]>();
const mockGetUserByEmail = jest.fn<Promise<User | null>, [string]>();
const mockResetFreeQuota = jest.fn<Promise<void>, [string]>();
const mockGetQuotaInfo = jest.fn<Promise<QuotaInfo>, [string]>();

jest.mock("@/lib/redis", () => ({
  getUser: (...args: unknown[]) => mockGetUser(args[0] as string),
  getUserByEmail: (...args: unknown[]) =>
    mockGetUserByEmail(args[0] as string),
}));

jest.mock("@/lib/quota", () => ({
  resetFreeQuota: (...args: unknown[]) =>
    mockResetFreeQuota(args[0] as string),
  getQuotaInfo: (...args: unknown[]) => mockGetQuotaInfo(args[0] as string),
}));

import { POST } from "@/app/api/internal/admin/quota/reset/route";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-001",
    googleId: "google-001",
    email: "owner@example.com",
    name: "Owner",
    avatarUrl: null,
    tier: "free",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    ...overrides,
  };
}

function makeQuota(overrides: Partial<QuotaInfo> = {}): QuotaInfo {
  return {
    userId: "user-001",
    tier: "free",
    remaining: 1,
    dailyLimit: 1,
    resetAt: "2026-03-18T00:00:00.000Z",
    credits: 0,
    creditsExpireAt: null,
    ...overrides,
  };
}

describe("admin quota reset route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = "test-admin-key";
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
  });

  it("resets free quota for the target user", async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockResetFreeQuota.mockResolvedValue();
    mockGetQuotaInfo.mockResolvedValue(makeQuota());

    const request = new NextRequest(
      "http://localhost/api/internal/admin/quota/reset",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-admin-key",
        },
        body: JSON.stringify({ userId: "user-001" }),
      }
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockResetFreeQuota).toHaveBeenCalledWith("user-001");
    expect(body.updated).toBe(true);
  });
});
