import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import Analytics from "@/components/Analytics";
import Providers from "@/components/Providers";
import RouteProgress from "@/components/RouteProgress";
import {
  BRAND_NAME,
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

export const metadata: Metadata = {
  ...siteMetadata,
  metadataBase: new URL(SITE_URL),
  applicationName: BRAND_NAME,
  title: { default: BRAND_NAME, template: `%s | ${BRAND_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: siteMetadata.keywords,
  alternates: siteMetadata.alternates,
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
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
