import { NextRequest } from "next/server";

const mockGetToken = jest.fn();
const mockCheckoutCreate = jest.fn();
const mockBillingPortalCreate = jest.fn();
const mockConstructEvent = jest.fn();
const mockRetrieveSubscription = jest.fn();
const mockListSubscriptions = jest.fn();
const mockRetrieveCustomer = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
const mockAddCredits = jest.fn();
const mockInitializeFreeQuota = jest.fn();
const mockUpdateUserTier = jest.fn();
const mockGetUserByEmail = jest.fn();
const mockGetUser = jest.fn();
const mockSendPaymentEmail = jest.fn();
const mockGetOrCreateStripeCustomer = jest.fn();
const mockFindStripeCustomerByEmail = jest.fn();

jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

jest.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCheckoutCreate(...args),
      },
    },
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockBillingPortalCreate(...args),
      },
    },
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
    subscriptions: {
      retrieve: (...args: unknown[]) => mockRetrieveSubscription(...args),
      list: (...args: unknown[]) => mockListSubscriptions(...args),
    },
    customers: {
      retrieve: (...args: unknown[]) => mockRetrieveCustomer(...args),
    },
  }),
  getOrCreateStripeCustomer: (...args: unknown[]) =>
    mockGetOrCreateStripeCustomer(...args),
  findStripeCustomerByEmail: (...args: unknown[]) =>
    mockFindStripeCustomerByEmail(...args),
  findProfessionalSubscriptionByCustomerId: (...args: unknown[]) =>
    mockListSubscriptions(...args),
}));

jest.mock("@/lib/config", () => ({
  config: {
    stripe: {
      isEnabled: true,
      secretKey: "sk_test_123",
      webhookSecret: "whsec_test_123",
      priceIds: {
        payAsYouGo: "price_payg_123",
        professional: "price_pro_123",
      },
    },
    nextauth: {
      url: "https://oldphotoliveai.com",
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => ({
    set: (...args: unknown[]) => mockRedisSet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  }),
  updateUserTier: (...args: unknown[]) => mockUpdateUserTier(...args),
  getUserByEmail: (...args: unknown[]) => mockGetUserByEmail(...args),
  getUser: (...args: unknown[]) => mockGetUser(...args),
}));

jest.mock("@/lib/quota", () => ({
  addCredits: (...args: unknown[]) => mockAddCredits(...args),
  initializeFreeQuota: (...args: unknown[]) => mockInitializeFreeQuota(...args),
}));

jest.mock("@/lib/email", () => ({
  sendPaymentEmail: (...args: unknown[]) => mockSendPaymentEmail(...args),
}));

jest.mock("@/lib/i18n-api", () => ({
  getRequestLocale: () => "en",
  getErrorMessage: (
    key: string,
    _locale: string,
    params?: Record<string, string>
  ) => (params?.reason ? `${key}:${params.reason}` : key),
}));

import { POST as checkoutPost } from "@/app/api/stripe/checkout/route";
import { POST as portalPost } from "@/app/api/stripe/portal/route";
import { GET as subscriptionGet } from "@/app/api/stripe/subscription/route";
import { POST as webhookPost } from "@/app/api/stripe/webhook/route";

describe("Stripe checkout route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
    mockInitializeFreeQuota.mockReset();
  });

  it("creates a subscription checkout session with subscription metadata", async () => {
    mockGetToken.mockResolvedValue({
      userId: "user-123",
      email: "owner@example.com",
      name: "Owner Example",
    });
    mockGetOrCreateStripeCustomer.mockResolvedValue({
      id: "cus_123",
    });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/test",
    });

    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "professional" }),
    });

    const response = await checkoutPost(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/c/pay/test");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: "price_pro_123", quantity: 1 }],
        success_url: "https://oldphotoliveai.com/pricing?success=true",
        cancel_url: "https://oldphotoliveai.com/pricing?cancelled=true",
        client_reference_id: "user-123",
        customer: "cus_123",
        metadata: {
          userId: "user-123",
          plan: "professional",
        },
        subscription_data: {
          metadata: {
            userId: "user-123",
            plan: "professional",
          },
        },
      })
    );
    expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledWith({
      email: "owner@example.com",
      userId: "user-123",
      name: "Owner Example",
    });
  });

  it("blocks pay-as-you-go checkout for professional users", async () => {
    mockGetToken.mockResolvedValue({
      userId: "user-123",
      email: "owner@example.com",
      name: "Owner Example",
    });
    mockGetUser.mockResolvedValue({
      id: "user-123",
      tier: "professional",
    });

    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pay_as_you_go" }),
    });

    const response = await checkoutPost(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("professionalAlreadyIncludesCredits");
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });
});

describe("Stripe billing portal route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
    mockInitializeFreeQuota.mockReset();
  });

  it("creates a billing portal session for the authenticated customer", async () => {
    mockGetToken.mockResolvedValue({
      userId: "user-123",
      email: "owner@example.com",
    });
    mockFindStripeCustomerByEmail.mockResolvedValue({
      id: "cus_123",
    });
    mockBillingPortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/session/test",
    });

    const request = new NextRequest("http://localhost/api/stripe/portal", {
      method: "POST",
    });

    const response = await portalPost(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://billing.stripe.com/session/test");
    expect(mockFindStripeCustomerByEmail).toHaveBeenCalledWith(
      "owner@example.com"
    );
    expect(mockBillingPortalCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://oldphotoliveai.com/pricing",
    });
  });
});

describe("Stripe subscription status route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
    mockInitializeFreeQuota.mockReset();
  });

  it("returns the scheduled cancellation date for an active subscription", async () => {
    mockGetToken.mockResolvedValue({
      userId: "user-123",
      email: "owner@example.com",
    });
    mockFindStripeCustomerByEmail.mockResolvedValue({
      id: "cus_123",
    });
    mockListSubscriptions.mockResolvedValue({
      id: "sub_123",
      created: 1,
      status: "active",
      cancel_at_period_end: true,
      current_period_end: 1776384000,
    });

    const request = new NextRequest(
      "http://localhost/api/stripe/subscription",
      {
        method: "GET",
      }
    );

    const response = await subscriptionGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFindStripeCustomerByEmail).toHaveBeenCalledWith(
      "owner@example.com"
    );
    expect(mockListSubscriptions).toHaveBeenCalledWith("cus_123");
    expect(body).toEqual({
      hasActiveSubscription: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-04-17T00:00:00.000Z",
    });
  });
});

describe("Stripe webhook route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
    mockInitializeFreeQuota.mockReset();
    mockSendPaymentEmail.mockResolvedValue(undefined);
  });

  it("processes checkout completion only once for duplicate webhook events", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          metadata: {
            userId: "user-123",
            plan: "pay_as_you_go",
          },
          customer_details: {
            email: "owner@example.com",
          },
        },
      },
    });
    mockRedisSet
      .mockResolvedValueOnce("OK")
      .mockResolvedValueOnce("OK")
      .mockResolvedValueOnce(null);

    const firstRequest = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: JSON.stringify({ any: "payload" }),
    });
    const secondRequest = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: JSON.stringify({ any: "payload" }),
    });

    const firstResponse = await webhookPost(firstRequest);
    const secondResponse = await webhookPost(secondRequest);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(mockAddCredits).toHaveBeenCalledTimes(1);
    expect(mockAddCredits).toHaveBeenCalledWith("user-123", 1, 30);
    expect(mockUpdateUserTier).toHaveBeenCalledTimes(1);
    expect(mockUpdateUserTier).toHaveBeenCalledWith("user-123", "pay_as_you_go");
    expect(mockSendPaymentEmail).toHaveBeenCalledTimes(1);
  });

  it("falls back to customer email when invoice payment failure lacks subscription metadata", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_failed_123",
      type: "invoice.payment_failed",
      data: {
        object: {
          customer_email: "owner@example.com",
          parent: {
            subscription_details: {
              subscription: "sub_123",
            },
          },
        },
      },
    });
    mockRetrieveSubscription.mockResolvedValue({
      metadata: {},
    });
    mockGetUserByEmail.mockResolvedValue({
      id: "user-by-email",
    });
    mockRedisSet
      .mockResolvedValueOnce("OK")
      .mockResolvedValueOnce("OK");

    const request = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: JSON.stringify({ any: "payload" }),
    });

    const response = await webhookPost(request);

    expect(response.status).toBe(200);
    expect(mockRetrieveSubscription).toHaveBeenCalledWith("sub_123");
    expect(mockGetUserByEmail).toHaveBeenCalledWith("owner@example.com");
    expect(mockUpdateUserTier).toHaveBeenCalledWith("user-by-email", "free");
    expect(mockInitializeFreeQuota).toHaveBeenCalledWith("user-by-email");
    expect(mockSendPaymentEmail).toHaveBeenCalledTimes(1);
  });

  it("downgrades a cancelled subscription by looking up the customer email", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_cancelled_123",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: {},
          customer: "cus_123",
        },
      },
    });
    mockRetrieveCustomer.mockResolvedValue({
      email: "owner@example.com",
    });
    mockGetUserByEmail.mockResolvedValue({
      id: "user-by-email",
    });
    mockRedisSet.mockResolvedValueOnce("OK");

    const request = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: JSON.stringify({ any: "payload" }),
    });

    const response = await webhookPost(request);

    expect(response.status).toBe(200);
    expect(mockRetrieveCustomer).toHaveBeenCalledWith("cus_123");
    expect(mockGetUserByEmail).toHaveBeenCalledWith("owner@example.com");
    expect(mockUpdateUserTier).toHaveBeenCalledWith("user-by-email", "free");
    expect(mockInitializeFreeQuota).toHaveBeenCalledWith("user-by-email");
  });
});
