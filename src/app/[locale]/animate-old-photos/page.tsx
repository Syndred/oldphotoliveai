import { redirect } from "next/navigation";
import { isValidLocale, localizePathname, type Locale } from "@/i18n/routing";

export default async function LocalizedAnimateOldPhotosPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  redirect(localizePathname(locale, "/animate"));
}
