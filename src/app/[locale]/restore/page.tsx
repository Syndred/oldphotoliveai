import { permanentRedirect } from "next/navigation";
import { isValidLocale, localizePathname, type Locale } from "@/i18n/routing";

// Middleware serves the required 301. This is a permanent fallback if the page
// is ever rendered without middleware.
export default async function LocalizedRestoreAliasPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  permanentRedirect(localizePathname(locale, "/restore-old-photos"));
}
