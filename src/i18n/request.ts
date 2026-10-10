import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isValidLocale,
} from "./routing";
import type { Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  let locale: Locale = defaultLocale;
  if (requestedLocale && isValidLocale(requestedLocale)) {
    locale = requestedLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
