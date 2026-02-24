// Middleware: Locale Detection + Authentication + Rate Limiting
// Requirements: 1.1, 9.1-9.5, 18.1, 18.2

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rateLimit";
import type { RateLimitType } from "@/types";
import { locales, defaultLocale, LOCALE_COOKIE } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

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

// ── Locale Detection ────────────────────────────────────────────────────────

function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const segments = header.split(",");
  for (const segment of segments) {
    const lang = segment.split(";")[0].trim().toLowerCase();
    // Check exact match first (e.g. "en", "zh")
    if (isValidLocale(lang)) return lang;
    // Check prefix match (e.g. "en-US" → "en", "zh-CN" → "zh")
    const prefix = lang.split("-")[0];
    if (isValidLocale(prefix)) return prefix;
  }
  return null;
}

function detectLocale(request: NextRequest): Locale {
  // 1. Cookie
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;

  // 2. Accept-Language header
  const acceptLang = request.headers.get("Accept-Language");
  const headerLocale = parseAcceptLanguage(acceptLang);
  if (headerLocale) return headerLocale;

  // 3. Default
  return defaultLocale;
}

// ── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Locale Detection & Cookie Persistence ─────────────────────────────
  const locale = detectLocale(request);
  const existingCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  let response: NextResponse | undefined;

  // We'll set the locale cookie on the response if it's not already set
  const needsCookie = existingCookie !== locale;

  // Skip public routes entirely (but still set locale cookie)
  if (isPublicRoute(pathname)) {
    response = NextResponse.next();
    if (needsCookie) {
      response.cookies.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60, // 1 year
        sameSite: "lax",
      });
    }
    return response;
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

  response = NextResponse.next();
  if (needsCookie) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Match all API routes except static files
    "/api/:path*",
    // Match page routes that might need auth
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
