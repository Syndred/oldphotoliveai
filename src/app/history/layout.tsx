import { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "History",
  description:
    "View and manage your past photo restoration tasks - download results or re-process images anytime.",
  path: "/history",
  robots: PRIVATE_PAGE_ROBOTS,
});

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
