// Middleware: Authentication + Rate Limiting
// Requirements: 1.1, 9.1-9.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rateLimit";
import type { RateLimitType } from "@/types";

// ── Route Configuration ─────────────────────────────────────────────────────

const PROTECTED_ROUTES = [
  "/api/upload",
  "/api/tasks",
  "/api/quota",
  "/api/history",
  "/api/stripe/checkout",
];

const PUBLIC_ROUTES = [
  "/api/auth",
  "/api/stripe/webhook",
  "/api/worker",
  "/login",
  "/pricing",
];

const UPLOAD_ROUTES = ["/api/upload"];

// ── Helpers ─────────────────────────────────────────────────────────────────

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  );
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isUploadRoute(pathname: string): boolean {
  return UPLOAD_ROUTES.some((route) => pathname.startsWith(route));
}

// ── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes entirely
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // ── Authentication Check ────────────────────────────────────────────────
  if (isProtectedRoute(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // API routes get 401, page routes get redirected
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // ── Rate Limiting ───────────────────────────────────────────────────
    const userId = token.sub ?? "anonymous";
    const rateLimitType: RateLimitType = isUploadRoute(pathname)
      ? "upload"
      : "api";

    const result = await checkRateLimit(userId, rateLimitType);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, retryAfter)),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.resetAt),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes except static files
    "/api/:path*",
    // Match page routes that might need auth
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
