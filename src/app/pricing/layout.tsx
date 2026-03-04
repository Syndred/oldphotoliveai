import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose the right plan for your photo restoration needs â€?free tier available, upgrade for more credits and watermark-free downloads.",
  openGraph: {
    title: "Pricing",
    description:
      "Choose the right plan for your photo restoration needs â€?free tier available, upgrade for more credits and watermark-free downloads.",
    url: "https://oldphotoliveai.com/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing",
    description:
      "Choose the right plan for your photo restoration needs â€?free tier available, upgrade for more credits and watermark-free downloads.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
