import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History",
  description:
    "View and manage your past photo restoration tasks — download results or re-process images anytime.",
  openGraph: {
    title: "History",
    description:
      "View and manage your past photo restoration tasks — download results or re-process images anytime.",
    url: "https://oldphotolive.com/history",
  },
  twitter: {
    card: "summary_large_image",
    title: "History",
    description:
      "View and manage your past photo restoration tasks — download results or re-process images anytime.",
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
