import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import Analytics from "@/components/Analytics";
import Providers from "@/components/Providers";
import RouteProgress from "@/components/RouteProgress";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://oldphotoliveai.com"),
  title: { default: "OldPhotoLive AI", template: "%s | OldPhotoLive AI" },
  description:
    "AI-powered photo restoration, colorization, and animation - transform faded memories into vivid moments",
  openGraph: {
    title: "OldPhotoLive AI",
    description: "AI-powered photo restoration, colorization, and animation",
    url: "https://oldphotoliveai.com",
    siteName: "OldPhotoLive AI",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "OldPhotoLive AI",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OldPhotoLive AI",
    description: "AI-powered photo restoration, colorization, and animation",
    images: ["/twitter-image"],
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
