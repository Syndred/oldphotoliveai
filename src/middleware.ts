import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRateLimitBucket } from "@/lib/rateLimitBucket";
import type { RateLimitType } from "@/types";
import { getErrorMessage } from "@/lib/i18n-api";
import {
  defaultLocale,
  getPathLocale,
  isValidLocale,
  localizePathname,
  routing,
  stripLocaleFromPathname,
  type Locale,
} from "@/i18n/routing";

const PROTECTED_API_ROUTES = [
  "/api/upload",
  "/api/tasks",
  "/api/quota",
  "/api/history",
  "/api/stripe/checkout",
  "/api/stripe/portal",
  "/api/stripe/subscription",
];

const PROTECTED_PAGE_ROUTES = ["/history", "/result"];
const UPLOAD_ROUTES = ["/api/upload"];
const handleI18nRouting = createIntlMiddleware(routing);
const PUBLIC_TRIAL_API_ROUTES = ["/api/upload", "/api/anonymous-tasks"];

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some((route) => pathname.startsWith(route));
}

function isProtectedPageRoute(pathname: string): boolean {
  return PROTECTED_PAGE_ROUTES.some((route) => pathname.startsWith(route));
}

function isAnonymousResultPage(request: NextRequest, pathname: string): boolean {
  return (
    pathname.startsWith("/result") &&
    Boolean(request.cookies.get("opla_anon_visitor")?.value)
  );
}

function isUploadRoute(pathname: string): boolean {
  return UPLOAD_ROUTES.some((route) => pathname.startsWith(route));
}

function isPublicTrialApiRoute(pathname: string): boolean {
  if (PUBLIC_TRIAL_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return true;
  }

  return /^\/api\/tasks\/[^/]+\/(status|stream|asset)$/.test(pathname);
}

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const segments = header.split(",");
  for (const segment of segments) {
    const lang = segment.split(";")[0].trim().toLowerCase();
    if (isValidLocale(lang)) return lang;

    const prefix = lang.split("-")[0];
    if (isValidLocale(prefix)) return prefix;
  }

  return null;
}

function detectLocale(request: NextRequest): Locale {
  const localeFromPath = getPathLocale(request.nextUrl.pathname);
  if (localeFromPath) return localeFromPath;

  const localeCookieConfig = routing.localeCookie;
  const cookieName =
    localeCookieConfig && typeof localeCookieConfig === "object"
      ? localeCookieConfig.name
      : undefined;
  const cookieLocale = cookieName
    ? request.cookies.get(cookieName)?.value
    : undefined;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;

  const headerLocale = parseAcceptLanguage(
    request.headers.get("Accept-Language")
  );
  if (headerLocale) return headerLocale;

  return defaultLocale;
}

async function ensureAuthenticated(
  request: NextRequest,
  locale: Locale
): Promise<NextResponse | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return null;
  }

  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const loginUrl = new URL(localizePathname(locale, "/login"), request.url);
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    const response = handleI18nRouting(request);

    if (response.headers.get("location")) {
      return response;
    }

    const locale = detectLocale(request);
    const normalizedPathname = stripLocaleFromPathname(pathname);

    if (
      isProtectedPageRoute(normalizedPathname) &&
      !isAnonymousResultPage(request, normalizedPathname)
    ) {
      const authRedirect = await ensureAuthenticated(request, locale);
      if (authRedirect) {
        return authRedirect;
      }
    }

    return response;
  }

  const locale = detectLocale(request);

  const isPublicTrialRoute = isPublicTrialApiRoute(pathname);

  if (!isProtectedApiRoute(pathname) && !isPublicTrialRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token && !isPublicTrialRoute) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp =
    request.ip ||
    (forwardedFor ? forwardedFor.split(",")[0].trim() : "") ||
    "unknown";
  const visitorId = request.cookies.get("opla_anon_visitor")?.value;
  const userId =
    (typeof token?.userId === "string" && token.userId) ||
    token?.sub ||
    (typeof token?.email === "string" && token.email) ||
    "";
  const rateLimitIdentifier = userId || visitorId || `ip:${clientIp}`;
  const rateLimitBucket = getRateLimitBucket(pathname, request.method);
  const rateLimitType: RateLimitType = isUploadRoute(pathname) ? "upload" : "api";

  try {
    const result = await checkRateLimit(
      `${rateLimitIdentifier}:${rateLimitBucket}`,
      rateLimitType
    );

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: getErrorMessage("rateLimited", locale) },
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
  } catch (error) {
    console.error("Rate limit check failed, bypassing:", error);
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Bypass", "1");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
