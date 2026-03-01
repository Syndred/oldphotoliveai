import { NextRequest } from "next/server";
import type { User, UserTier } from "@/types";

const mockGetUser = jest.fn<Promise<User | null>, [string]>();
const mockGetUserByEmail = jest.fn<Promise<User | null>, [string]>();
const mockUpdateUserTier = jest.fn<Promise<void>, [string, UserTier]>();
const mockInitializeFreeQuota = jest.fn<Promise<void>, [string]>();
const mockEnsureFreeQuotaInitialized = jest.fn<Promise<void>, [string]>();

jest.mock("@/lib/redis", () => ({
  getUser: (...args: unknown[]) => mockGetUser(args[0] as string),
  getUserByEmail: (...args: unknown[]) => mockGetUserByEmail(args[0] as string),
  updateUserTier: (...args: unknown[]) =>
    mockUpdateUserTier(args[0] as string, args[1] as UserTier),
}));

jest.mock("@/lib/quota", () => ({
  initializeFreeQuota: (...args: unknown[]) =>
    mockInitializeFreeQuota(args[0] as string),
  ensureFreeQuotaInitialized: (...args: unknown[]) =>
    mockEnsureFreeQuotaInitialized(args[0] as string),
}));

import { POST } from "@/app/api/internal/admin/tier/route";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-001",
    googleId: "google-001",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: null,
    tier: "free",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  const requestBody =
    typeof body === "string" ? body : JSON.stringify(body);

  return new NextRequest("http://localhost/api/internal/admin/tier", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: requestBody,
  });
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockGetUserByEmail.mockReset();
  mockUpdateUserTier.mockReset();
  mockInitializeFreeQuota.mockReset();
  mockEnsureFreeQuotaInitialized.mockReset();
  process.env.ADMIN_API_KEY = "test-admin-key";
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.ADMIN_API_KEY;
  jest.restoreAllMocks();
});

describe("POST /api/internal/admin/tier", () => {
  it("returns 503 when ADMIN_API_KEY is not configured", async () => {
    delete process.env.ADMIN_API_KEY;

    const req = makeRequest(
      { userId: "user-001", tier: "professional" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("ADMIN_API_KEY is not configured");
  });

  it("returns 401 when admin key is missing", async () => {
    const req = makeRequest({ userId: "user-001", tier: "professional" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Please sign in to continue");
  });

  it("returns 401 when admin key is invalid", async () => {
    const req = makeRequest(
      { userId: "user-001", tier: "professional" },
      { Authorization: "Bearer wrong-key" }
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when JSON body is invalid", async () => {
    const req = makeRequest("not-json", {
      Authorization: "Bearer test-admin-key",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 when payload is invalid", async () => {
    const req = makeRequest(
      { userId: "user-001", tier: "vip" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid payload. Expected { tier, userId? , email? } and either userId or email.");
  });

  it("returns 400 when both userId and email are missing", async () => {
    const req = makeRequest(
      { tier: "professional" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 404 when user does not exist", async () => {
    mockGetUser.mockResolvedValue(null);

    const req = makeRequest(
      { userId: "missing-user", tier: "professional" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("User not found");
    expect(mockUpdateUserTier).not.toHaveBeenCalled();
  });

  it("returns 500 when Redis operations fail", async () => {
    mockGetUser.mockRejectedValue(new Error("Redis unavailable"));

    const req = makeRequest(
      { userId: "user-001", tier: "professional" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update tier");
  });

  it("updates tier successfully for non-free tier", async () => {
    mockGetUser.mockResolvedValue(makeUser({ id: "user-001", tier: "free" }));
    mockUpdateUserTier.mockResolvedValue();

    const req = makeRequest(
      { userId: "user-001", tier: "professional" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      userId: "user-001",
      email: "test@example.com",
      previousTier: "free",
      tier: "professional",
      updated: true,
    });
    expect(mockUpdateUserTier).toHaveBeenCalledWith("user-001", "professional");
    expect(mockInitializeFreeQuota).not.toHaveBeenCalled();
    expect(mockEnsureFreeQuotaInitialized).not.toHaveBeenCalled();
  });

  it("supports x-admin-key header and re-initializes free quota when downgrading from paid", async () => {
    mockGetUser.mockResolvedValue(
      makeUser({ id: "user-001", tier: "professional" })
    );
    mockUpdateUserTier.mockResolvedValue();
    mockInitializeFreeQuota.mockResolvedValue();

    const req = makeRequest(
      { userId: "user-001", tier: "free" },
      { "x-admin-key": "test-admin-key" }
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockUpdateUserTier).toHaveBeenCalledWith("user-001", "free");
    expect(mockInitializeFreeQuota).toHaveBeenCalledWith("user-001");
    expect(mockEnsureFreeQuotaInitialized).not.toHaveBeenCalled();
  });

  it("ensures free quota without reset when tier stays free", async () => {
    mockGetUser.mockResolvedValue(makeUser({ id: "user-001", tier: "free" }));
    mockUpdateUserTier.mockResolvedValue();
    mockEnsureFreeQuotaInitialized.mockResolvedValue();

    const req = makeRequest(
      { userId: "user-001", tier: "free" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockInitializeFreeQuota).not.toHaveBeenCalled();
    expect(mockEnsureFreeQuotaInitialized).toHaveBeenCalledWith("user-001");
  });

  it("updates tier successfully using email", async () => {
    mockGetUserByEmail.mockResolvedValue(
      makeUser({ id: "user-by-email", email: "owner@example.com", tier: "pay_as_you_go" })
    );
    mockUpdateUserTier.mockResolvedValue();

    const req = makeRequest(
      { email: "owner@example.com", tier: "professional" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.userId).toBe("user-by-email");
    expect(body.email).toBe("owner@example.com");
    expect(mockGetUserByEmail).toHaveBeenCalledWith("owner@example.com");
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockUpdateUserTier).toHaveBeenCalledWith("user-by-email", "professional");
  });

  it("returns 404 when email lookup misses", async () => {
    mockGetUserByEmail.mockResolvedValue(null);

    const req = makeRequest(
      { email: "missing@example.com", tier: "professional" },
      { Authorization: "Bearer test-admin-key" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("User not found");
  });
});
