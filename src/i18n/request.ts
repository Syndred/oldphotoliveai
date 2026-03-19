import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  defaultLocale,
  isValidLocale,
  locales,
} from "./routing";
import type { Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = defaultLocale;
  if (requestedLocale && isValidLocale(requestedLocale)) {
    locale = requestedLocale;
  } else if (
    cookieLocale &&
    (locales as readonly string[]).includes(cookieLocale)
  ) {
    locale = cookieLocale as Locale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
