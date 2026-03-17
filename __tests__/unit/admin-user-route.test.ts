import { NextRequest } from "next/server";
import type { QuotaInfo, User } from "@/types";

const mockGetUser = jest.fn<Promise<User | null>, [string]>();
const mockGetUserByEmail = jest.fn<Promise<User | null>, [string]>();
const mockGetQuotaInfo = jest.fn<Promise<QuotaInfo>, [string]>();
const mockFindStripeCustomerByEmail = jest.fn();
const mockFindProfessionalSubscriptionByCustomerId = jest.fn();

jest.mock("@/lib/redis", () => ({
  getUser: (...args: unknown[]) => mockGetUser(args[0] as string),
  getUserByEmail: (...args: unknown[]) =>
    mockGetUserByEmail(args[0] as string),
}));

jest.mock("@/lib/quota", () => ({
  getQuotaInfo: (...args: unknown[]) => mockGetQuotaInfo(args[0] as string),
}));

jest.mock("@/lib/stripe", () => ({
  findStripeCustomerByEmail: (...args: unknown[]) =>
    mockFindStripeCustomerByEmail(args[0] as string),
  findProfessionalSubscriptionByCustomerId: (...args: unknown[]) =>
    mockFindProfessionalSubscriptionByCustomerId(args[0] as string),
}));

import { GET } from "@/app/api/internal/admin/user/route";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-001",
    googleId: "google-001",
    email: "owner@example.com",
    name: "Owner",
    avatarUrl: null,
    tier: "professional",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    ...overrides,
  };
}

function makeQuota(overrides: Partial<QuotaInfo> = {}): QuotaInfo {
  return {
    userId: "user-001",
    tier: "professional",
    remaining: 0,
    dailyLimit: null,
    resetAt: null,
    credits: 0,
    creditsExpireAt: null,
    ...overrides,
  };
}

describe("admin user route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = "test-admin-key";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    process.env.STRIPE_PRICE_PAY_AS_YOU_GO = "price_payg";
    process.env.STRIPE_PRICE_PROFESSIONAL = "price_pro";
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_PAY_AS_YOU_GO;
    delete process.env.STRIPE_PRICE_PROFESSIONAL;
  });

  it("requires admin authentication", async () => {
    const request = new NextRequest("http://localhost/api/internal/admin/user?email=owner@example.com");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns a user snapshot by email", async () => {
    mockGetUserByEmail.mockResolvedValue(makeUser());
    mockGetQuotaInfo.mockResolvedValue(makeQuota());
    mockFindStripeCustomerByEmail.mockResolvedValue({ id: "cus_123" });
    mockFindProfessionalSubscriptionByCustomerId.mockResolvedValue({
      status: "active",
      cancel_at_period_end: true,
      current_period_end: 1776384000,
    });

    const request = new NextRequest(
      "http://localhost/api/internal/admin/user?email=owner@example.com",
      {
        headers: {
          Authorization: "Bearer test-admin-key",
        },
      }
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetUserByEmail).toHaveBeenCalledWith("owner@example.com");
    expect(mockGetQuotaInfo).toHaveBeenCalledWith("user-001");
    expect(body.user.email).toBe("owner@example.com");
    expect(body.stripe.customerId).toBe("cus_123");
    expect(body.stripe.cancelAtPeriodEnd).toBe(true);
    expect(body.stripe.currentPeriodEnd).toBe("2026-04-17T00:00:00.000Z");
  });
});
