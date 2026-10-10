"use client";

import { createElement, forwardRef, type ComponentProps } from "react";
import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import { publicNavigationHref, routing, type Locale } from "./routing";

const intlNavigation = createNavigation(routing);
export const usePathname = intlNavigation.usePathname;

type NavigationLinkProps = ComponentProps<typeof NextLink> & { locale?: Locale };

// Next Link retains prefetch/ref/accessibility behavior while every href points
// straight to an existing public translation or an application deep route.
export const Link = forwardRef<HTMLAnchorElement, NavigationLinkProps>(
  function LocalizedLink({ href, locale, ...props }, ref) {
    const currentLocale = useLocale() as Locale;
    return createElement(NextLink, {
      ...props,
      href: publicNavigationHref(locale ?? currentLocale, href),
      ref,
    });
  }
);

type RouterOptions = Parameters<ReturnType<typeof useNextRouter>["push"]>[1] & {
  locale?: Locale;
};

export function useRouter() {
  const router = useNextRouter();
  const currentLocale = useLocale() as Locale;
  return {
    ...router,
    push(href: string, options?: RouterOptions) {
      const { locale = currentLocale, ...nextOptions } = options ?? {};
      router.push(publicNavigationHref(locale, href) as string, nextOptions);
    },
    replace(href: string, options?: RouterOptions) {
      const { locale = currentLocale, ...nextOptions } = options ?? {};
      router.replace(publicNavigationHref(locale, href) as string, nextOptions);
    },
    prefetch(href: string, options?: { locale?: Locale }) {
      router.prefetch(publicNavigationHref(options?.locale ?? currentLocale, href) as string);
    },
  };
}
