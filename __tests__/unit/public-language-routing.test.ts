import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import type { IncomingMessage } from "http";
import { matchHas, prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";
import { LEGACY_REDIRECTS } from "@/config/redirects.cjs";
import { buildLanguageAlternates, buildLocalizedPageMetadata } from "@/lib/seo";
import { languageSwitchPathname, publicNavigationHref, publicPathname, routing } from "@/i18n/routing";

// Exercise Next's real custom-route parser rather than mocking route resolution.
function redirectDestination(pathname: string, headers: Record<string, string> = {}) {
  for (const rule of LEGACY_REDIRECTS) {
    const params = getPathMatch(rule.source, { strict: true })(pathname);
    if (params && matchHas({ headers } as IncomingMessage, {}, undefined, rule.missing)) {
      return prepareDestination({ destination: rule.destination, params, query: { orderId: "order-123", session_id: "cs-return" }, appendParamsToQuery: false });
    }
  }
  return undefined;
}

describe("public language migration routes", () => {
  it.each([
    ["/en/colorize", "/colorize-old-photos"],
    ["/en/colorize/", "/colorize-old-photos"],
    ["/en/restore-old-photos/", "/restore-old-photos"],
    ["/es/", "/"],
    ["/ja/", "/"],
    ["/es/colorize-old-photos/", "/colorize-old-photos"],
    ["/ja/pricing/", "/pricing"],
    ["/zh/animate-old-photos/", "/zh"],
    ["/en/restore-old-photos", "/restore-old-photos"],
    ["/en/privacy", "/privacy"],
    ["/es/colorize", "/colorize-old-photos"],
    ["/ja/animate-old-photos", "/animate"],
    ["/ja/pricing", "/pricing"],
    ["/es/result/task-123", "/result/task-123"],
    ["/ja/history", "/history"],
    ["/ja/admin", "/admin"],
    ["/es/login", "/login"],
    ["/zh/animate-old-photos", "/zh"],
    ["/zh/blog/example", "/zh"],
    ["/zh/photo-restoration-cost", "/zh"],
    ["/zh/unknown-old-page", "/zh"],
    ["/zh/privacy", "/privacy"],
    ["/zh/terms", "/terms"],
  ])("%s redirects directly to %s with checkout query intact", (from, to) => {
    const result = redirectDestination(from);
    expect(result?.parsedDestination.pathname).toBe(to);
    expect(result?.parsedDestination.query).toEqual({ orderId: "order-123", session_id: "cs-return" });
    expect(redirectDestination(to)).toBeUndefined();
  });

  it.each(["/zh", "/zh/pricing", "/zh/pricing/", "/zh/colorize-old-photos", "/zh/colorize-old-photos/", "/zh/result/task-123", "/zh/history", "/zh/login", "/zh/admin"])("preserves %s", pathname => {
    expect(redirectDestination(pathname)).toBeUndefined();
  });

  it("does not redirect next-intl internal English rewrites", () => {
    for (const pathname of ["/en", "/en/colorize-old-photos", "/en/pricing", "/en/restore-old-photos"]) {
      expect(redirectDestination(pathname, { "x-next-intl-locale": "en" })).toBeUndefined();
      expect(redirectDestination(pathname)).toBeDefined();
    }
  });

  it.each(["/brand-icon.png/", "/favicon.ico/", "/sitemap.xml/", "/examples/photo.jpg/"])("normalizes static %s in the configuration layer", path => {
    const result = redirectDestination(path);
    expect(result?.parsedDestination.pathname).toBe(path.slice(0, -1));
    expect(result?.parsedDestination.query).toEqual({ orderId: "order-123", session_id: "cs-return" });
    expect(LEGACY_REDIRECTS.find(rule => getPathMatch(rule.source, { strict: true })(path))?.statusCode).toBe(308);
    expect(redirectDestination(path.slice(0, -1))).toBeUndefined();
  });

  it("does not advertise redirected translations in hreflang or middleware headers", () => {
    expect(routing.alternateLinks).toBe(false);
    expect(buildLanguageAlternates("/pricing")).toEqual({
      en: "https://oldphotoliveai.com/pricing", "zh-Hans": "https://oldphotoliveai.com/zh/pricing", "x-default": "https://oldphotoliveai.com/pricing",
    });
    expect(buildLanguageAlternates("/restore-old-photos")).toEqual({ en: "https://oldphotoliveai.com/restore-old-photos", "x-default": "https://oldphotoliveai.com/restore-old-photos" });
    expect(buildLocalizedPageMetadata({ locale: "zh", path: "/pricing", title: "Pricing", description: "Pricing" }).alternates?.canonical).toBe("/zh/pricing");
    expect(buildLocalizedPageMetadata({ locale: "zh", path: "/result/task-123", title: "Result", description: "Private", robots: { index: false, follow: false } }).alternates?.languages).toBeUndefined();
  });

  it("normalizes internal navigation without losing query/hash or app ids", () => {
    expect(publicPathname("zh", "/restore")).toBe("/restore-old-photos");
    expect(publicNavigationHref("zh", "/colorize?source=nav#upload")).toBe("/zh/colorize-old-photos?source=nav#upload");
    expect(publicNavigationHref("es", "/es/result/task-123?token=return#result")).toBe("/result/task-123?token=return#result");
    expect(publicNavigationHref("zh", { pathname: "/terms", query: { source: "checkout" }, hash: "refunds" })).toEqual({ pathname: "/terms", query: { source: "checkout" }, hash: "refunds" });
    expect(publicNavigationHref("zh", "https://example.com/terms?x=1")).toBe("https://example.com/terms?x=1");
    expect(publicNavigationHref("zh", "//example.com/path")).toBe("//example.com/path");
    expect(publicNavigationHref("zh", { hostname: "example.com", pathname: "/terms" })).toEqual({ hostname: "example.com", pathname: "/terms" });
    expect(publicNavigationHref("zh", "#upload")).toBe("#upload");
    expect(languageSwitchPathname("zh", "/restore-old-photos")).toBe("/zh");
  });
});
