import { NextRequest } from "next/server";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/internal/admin/session/route";

function makeRequest(
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest("http://localhost/api/internal/admin/session", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("admin session route", () => {
  beforeEach(() => {
    process.env.ADMIN_API_KEY = "test-admin-key";
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
  });

  it("reports unlocked=false when no cookie is present", async () => {
    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      configured: true,
      authenticated: false,
    });
  });

  it("accepts a valid admin key and sets a cookie", async () => {
    const response = await POST(
      makeRequest("POST", { key: "test-admin-key" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(response.headers.get("set-cookie")).toContain(
      "admin_session=test-admin-key"
    );
  });

  it("reports authenticated=true when the cookie matches", async () => {
    const response = await GET(
      makeRequest("GET", undefined, {
        Cookie: "admin_session=test-admin-key",
      })
    );
    const body = await response.json();

    expect(body).toEqual({
      configured: true,
      authenticated: true,
    });
  });

  it("rejects an invalid admin key", async () => {
    const response = await POST(makeRequest("POST", { key: "wrong-key" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid admin key");
  });

  it("clears the cookie on logout", async () => {
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
