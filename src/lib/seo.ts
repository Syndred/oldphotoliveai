import type { Metadata } from "next";
import {
  BRAND_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_IMAGE,
  SITE_URL,
} from "@/lib/site";
import {
  defaultLocale,
  locales,
  localizePathname,
  type Locale,
} from "@/i18n/routing";

type OpenGraphType = "website" | "article";

interface PageMetadataOptions {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  robots?: Metadata["robots"];
  type?: OpenGraphType;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface FaqJsonLdItem {
  question: string;
  answer: string;
}

interface SoftwareApplicationJsonLdOptions {
  name: string;
  description: string;
  path: string;
  locale?: Locale;
  keywords?: string[];
  applicationCategory?: string;
  operatingSystem?: string;
  price?: string;
  priceCurrency?: string;
}

export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

const HREFLANG_BY_LOCALE: Record<Locale, string> = {
  en: "en",
  zh: "zh-Hans",
  es: "es",
  ja: "ja",
};

const OG_LOCALE_BY_LOCALE: Record<Locale, string> = {
  en: "en_US",
  zh: "zh_CN",
  es: "es_ES",
  ja: "ja_JP",
};

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`;
  return new URL(normalizedPath, SITE_URL).toString();
}

export function absoluteLocalizedUrl(locale: Locale, path = "/"): string {
  return absoluteUrl(localizePathname(locale, path));
}

export function buildLanguageAlternates(path = "/") {
  const languages = Object.fromEntries(
    locales.map((locale) => [
      HREFLANG_BY_LOCALE[locale],
      absoluteLocalizedUrl(locale, path),
    ])
  ) as Record<string, string>;

  languages["x-default"] = absoluteLocalizedUrl(defaultLocale, path);

  return languages;
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  keywords,
  robots,
  type = "website",
  publishedTime,
  modifiedTime,
  section,
}: PageMetadataOptions): Metadata {
  const canonicalPath = path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`;
  const canonicalUrl = absoluteUrl(canonicalPath);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: BRAND_NAME,
      type,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(type === "article"
        ? {
            publishedTime,
            modifiedTime,
            section,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_TWITTER_IMAGE],
    },
  };
}

interface LocalizedPageMetadataOptions
  extends Omit<PageMetadataOptions, "path"> {
  locale: Locale;
  path?: string;
}

export function buildLocalizedPageMetadata({
  locale,
  path = "/",
  ...options
}: LocalizedPageMetadataOptions): Metadata {
  const localizedPath = localizePathname(locale, path);
  const baseMetadata = buildPageMetadata({
    ...options,
    path: localizedPath,
  });

  return {
    ...baseMetadata,
    alternates: {
      canonical: localizedPath,
      languages: buildLanguageAlternates(path),
    },
    openGraph: {
      ...baseMetadata.openGraph,
      locale: OG_LOCALE_BY_LOCALE[locale],
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  locale?: Locale
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: locale
        ? absoluteLocalizedUrl(locale, item.path)
        : absoluteUrl(item.path),
    })),
  };
}

export function buildFaqJsonLd(items: FaqJsonLdItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildSoftwareApplicationJsonLd({
  name,
  description,
  path,
  locale,
  keywords,
  applicationCategory = "MultimediaApplication",
  operatingSystem = "Web",
  price = "0",
  priceCurrency = "USD",
}: SoftwareApplicationJsonLdOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url: locale ? absoluteLocalizedUrl(locale, path) : absoluteUrl(path),
    applicationCategory,
    operatingSystem,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
    },
    ...(keywords?.length ? { keywords: keywords.join(", ") } : {}),
  };
}
