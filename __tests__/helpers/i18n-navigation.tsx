import React from "react";

type HrefLike =
  | string
  | {
      pathname?: string;
      query?: Record<string, string | number | boolean | undefined>;
    };

let mockLocale = "en";
let mockPathname = "/";
const LOCALE_PREFIX_RE = /^\/(en|zh|es|ja)(?=\/|$)/;

export const mockRouterPush = jest.fn();
export const mockRouterReplace = jest.fn();
export const mockRouterPrefetch = jest.fn();
export const mockRedirect = jest.fn();

function serializeHref(href: HrefLike): string {
  if (typeof href === "string") {
    return href;
  }

  const pathname = href.pathname ?? "/";
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(href.query ?? {})) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function localizeHref(href: string, locale?: string): string {
  const activeLocale = locale ?? mockLocale;
  const hrefWithoutLocale = href.replace(LOCALE_PREFIX_RE, "") || "/";
  const normalizedHref =
    hrefWithoutLocale === "/" ? "" : hrefWithoutLocale.replace(/^\/+/, "/");
  return `/${activeLocale}${normalizedHref}`;
}

export function __setMockPathname(pathname: string) {
  mockPathname = pathname;
}

export function __setMockLocale(locale: string) {
  mockLocale = locale;
}

export function __resetI18nNavigationMocks() {
  mockLocale = "en";
  mockPathname = "/";
  mockRouterPush.mockReset();
  mockRouterReplace.mockReset();
  mockRouterPrefetch.mockReset();
  mockRedirect.mockReset();
}

export function Link({
  href,
  locale,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: HrefLike;
  locale?: string;
}) {
  const serializedHref = serializeHref(href);
  const localizedHref = localizeHref(serializedHref, locale);

  return (
    <a href={localizedHref} {...props}>
      {children}
    </a>
  );
}

export function redirect(href: HrefLike) {
  mockRedirect(serializeHref(href));
}

export function usePathname() {
  return mockPathname;
}

export function useRouter() {
  function localizeForRouter(href: HrefLike, locale?: string) {
    return localizeHref(serializeHref(href), locale);
  }

  return {
    push: (href: HrefLike, options?: { locale?: string }) =>
      mockRouterPush(localizeForRouter(href, options?.locale)),
    replace: (href: HrefLike, options?: { locale?: string }) =>
      mockRouterReplace(localizeForRouter(href, options?.locale), options),
    prefetch: (href: HrefLike, options?: { locale?: string }) =>
      mockRouterPrefetch(localizeForRouter(href, options?.locale)),
  };
}

export function getPathname(href: HrefLike) {
  return serializeHref(href);
}
