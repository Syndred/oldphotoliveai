import { NextRequest } from "next/server";
import type { User } from "@/types";

const mockListRecentUsers = jest.fn<Promise<User[]>, [number]>();

jest.mock("@/lib/redis", () => ({
  listRecentUsers: (...args: unknown[]) => mockListRecentUsers(args[0] as number),
}));

import { GET } from "@/app/api/internal/admin/users/route";

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

describe("admin recent users route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = "test-admin-key";
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
  });

  it("returns recent users when authorized", async () => {
    mockListRecentUsers.mockResolvedValue([
      makeUser(),
      makeUser({
        id: "user-002",
        email: "another@example.com",
        name: "Another",
      }),
    ]);

    const request = new NextRequest(
      "http://localhost/api/internal/admin/users?limit=8",
      {
        headers: {
          Authorization: "Bearer test-admin-key",
        },
      }
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockListRecentUsers).toHaveBeenCalledWith(8);
    expect(body.users).toHaveLength(2);
  });
});
