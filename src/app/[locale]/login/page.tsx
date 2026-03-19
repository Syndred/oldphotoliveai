import type { Metadata } from "next";
import LoginPage from "@/app/login/page";
import { PAGE_SEO_COPY } from "@/content/page-seo";
import { isValidLocale, type Locale } from "@/i18n/routing";
import {
  PRIVATE_PAGE_ROBOTS,
  buildLocalizedPageMetadata,
} from "@/lib/seo";

interface LocalizedLoginPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: LocalizedLoginPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const seo = PAGE_SEO_COPY[locale].login;

  return buildLocalizedPageMetadata({
    locale,
    title: seo.title,
    description: seo.description,
    path: "/login",
    robots: PRIVATE_PAGE_ROBOTS,
  });
}

export default function LocalizedLoginPage() {
  return <LoginPage />;
}
