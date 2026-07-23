import { v4 as uuidv4 } from "uuid";
import type { NextRequest, NextResponse } from "next/server";

export const ANONYMOUS_VISITOR_COOKIE = "opla_anon_visitor";
export const ANONYMOUS_TRIAL_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function createAnonymousVisitorId(): string {
  return uuidv4();
}

export function buildAnonymousUserId(visitorId: string): string {
  return `anonymous:${visitorId}`;
}

export function isAnonymousUserId(userId: string): boolean {
  return userId.startsWith("anonymous:");
}

export function getAnonymousVisitorId(request: NextRequest): string | null {
  const value = request.cookies.get(ANONYMOUS_VISITOR_COOKIE)?.value?.trim();
  return value || null;
}

export function setAnonymousVisitorCookie(
  response: NextResponse,
  visitorId: string
): void {
  response.cookies.set(ANONYMOUS_VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANONYMOUS_TRIAL_MAX_AGE_SECONDS,
  });
}
