import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { config } from "./config";
import { getErrorMessage } from "./i18n-api";
import type { Locale } from "@/i18n/routing";

export const ADMIN_SESSION_COOKIE = "admin_session";

export function isAdminConfigured(): boolean {
  return Boolean(config.admin.apiKey);
}

export function getAdminKeyFromRequest(request: NextRequest): string {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const headerKey = request.headers.get("x-admin-key")?.trim();
  if (headerKey) {
    return headerKey;
  }

  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim() || "";
}

export function isValidAdminKey(key: string): boolean {
  return Boolean(key) && Boolean(config.admin.apiKey) && key === config.admin.apiKey;
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export function requireAdmin(
  request: NextRequest,
  locale: Locale
): NextResponse | null {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const requestKey = getAdminKeyFromRequest(request);
  if (!isValidAdminKey(requestKey)) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  return null;
}
