import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isValidLocale, locales, type Locale } from "@/i18n/routing";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  if (!isValidLocale(params.locale)) {
    notFound();
  }

  setRequestLocale(params.locale as Locale);
  return children;
}
