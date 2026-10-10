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
  isApplicationPath,
  hasChinesePublicPage,
  localizePathname,
  routing,
  stripLocaleFromPathname,
  type Locale,
} from "@/i18n/routing";

const PROTECTED_API_ROUTES = [
  "/api/upload",
  "/api/tasks",
  "/api/photo-orders",
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

// Keep these permanent aliases for at least one year. They consolidate every
// historical URL directly into its final canonical URL without redirect chains.
const PERMANENT_PUBLIC_ALIASES: Record<string, string> = {
  "/colorize": "/colorize-old-photos",
  "/restore": "/restore-old-photos",
  "/animate-old-photos": "/animate",
};

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

  return /^\/api\/tasks\/[^/]+\/(status|stream|asset|retry)$/.test(pathname);
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

  // Preserve Next's previous 308 behavior for API/static slash URLs. Public
  // page URLs instead combine slash + locale normalization in the 301 below.
  const isNonPagePath = pathname === "/api/" || pathname.startsWith("/api/") || pathname.startsWith("/_next/") || /\.[^/]+\/$/.test(pathname);
  if (isNonPagePath && pathname.endsWith("/")) {
    const url = new URL(request.url);
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 308);
  }
  if (pathname.startsWith("/_next/")) return NextResponse.next();

  if (!pathname.startsWith("/api/")) {
    // Normalize public aliases before next-intl rewrites to internal /en routes.
    const locale = getPathLocale(pathname) ?? defaultLocale;
    const basePath = stripLocaleFromPathname(pathname).replace(/\/$/, "") || "/";
    const finalBasePath = PERMANENT_PUBLIC_ALIASES[basePath] ?? basePath;
    const applicationPath = isApplicationPath(basePath);
    let canonicalLocale = locale;
    let destinationPath = finalBasePath;
    if (locale === "es" || locale === "ja") {
      canonicalLocale = defaultLocale;
    } else if (!applicationPath && locale === "zh" && !hasChinesePublicPage(finalBasePath)) {
      if (finalBasePath === "/terms" || finalBasePath === "/privacy") {
        canonicalLocale = defaultLocale;
      } else {
        destinationPath = "/";
      }
    }
    const canonicalPath = localizePathname(canonicalLocale, destinationPath);
    if (pathname !== canonicalPath) {
      const url = new URL(request.url);
      url.pathname = canonicalPath;
      return NextResponse.redirect(url, 301);
    }
    const response = handleI18nRouting(request);

    if (response.headers.get("location")) {
      return response;
    }

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
    (forwardedFor ? forwardedFor.split(",")[0].trim() : "") ||
    request.headers.get("x-real-ip")?.trim() ||
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand-icon.png|apple-touch-icon.png|robots.txt|sitemap.xml).*)",
  ],
};
