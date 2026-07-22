import { redirect } from "next/navigation";
import { isValidLocale, localizePathname, type Locale } from "@/i18n/routing";

export default function LocalizedAnimateOldPhotosPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  redirect(localizePathname(locale, "/animate"));
}
