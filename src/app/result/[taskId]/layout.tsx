import { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string }>;
}): Promise<Metadata> {
  const { taskId } = await params;

  return buildPageMetadata({
    title: `Result ${taskId}`,
    description:
      "View your AI-restored photo result and compare before-and-after output.",
    path: `/result/${taskId}`,
    robots: PRIVATE_PAGE_ROBOTS,
  });
}

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
