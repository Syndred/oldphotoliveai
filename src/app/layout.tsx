import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import Analytics from "@/components/Analytics";
import Providers from "@/components/Providers";
import RouteProgress from "@/components/RouteProgress";
import {
  APPLE_TOUCH_ICON,
  BRAND_NAME,
  BRAND_ICON,
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import { buildPageMetadata } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;

const siteMetadata = buildPageMetadata({
  title: BRAND_NAME,
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "ai photo restoration",
    "restore old photos online",
    "photo colorization ai",
    "animate old photos",
    "old photo restoration",
  ],
});

const siteJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    logo: new URL(BRAND_ICON, SITE_URL).toString(),
    email: "support@oldphotoliveai.com",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: BRAND_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
    },
  },
];

export const metadata: Metadata = {
  ...siteMetadata,
  metadataBase: new URL(SITE_URL),
  applicationName: BRAND_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND_NAME,
  },
  title: { default: BRAND_NAME, template: `%s | ${BRAND_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: siteMetadata.keywords,
  alternates: siteMetadata.alternates,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: BRAND_ICON, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: APPLE_TOUCH_ICON, type: "image/png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  verification: GOOGLE_SITE_VERIFICATION
    ? {
        google: GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
  category: "photo restoration",
  openGraph: {
    ...siteMetadata.openGraph,
    title: BRAND_NAME,
    description: SITE_TAGLINE,
  },
  twitter: {
    ...siteMetadata.twitter,
    title: BRAND_NAME,
    description: SITE_TAGLINE,
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <RouteProgress />
            <Analytics />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
