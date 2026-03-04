import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string }>;
}): Promise<Metadata> {
  const { taskId } = await params;
  return {
    title: `Result ${taskId}`,
    description:
      "View your AI-restored photo result — compare before and after, download colorized images and animated videos.",
    openGraph: {
      title: `Result ${taskId}`,
      description:
        "View your AI-restored photo result — compare before and after, download colorized images and animated videos.",
      url: `https://oldphotoliveai.com/result/${taskId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Result ${taskId}`,
      description:
        "View your AI-restored photo result — compare before and after, download colorized images and animated videos.",
    },
  };
}

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
