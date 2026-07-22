import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import { getBlogPosts } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { isValidLocale, type Locale } from "@/i18n/routing";
import { buildLocalizedPageMetadata } from "@/lib/seo";

interface BlogIndexPageProps {
  params: {
    locale: string;
  };
}

export function generateMetadata({
  params,
}: BlogIndexPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;

  return buildLocalizedPageMetadata({
    locale,
    title: "AI Photo Restoration Blog",
    description:
      "Guides for AI photo restoration, colorizing black and white photos, repairing damaged family pictures, and animating old portraits.",
    path: "/blog",
    keywords: [
      "AI photo restoration blog",
      "colorize black and white photos guide",
      "restore old family photos",
      "old photo colorizer",
    ],
  });
}

export default function BlogIndexPage({ params }: BlogIndexPageProps) {
  if (!isValidLocale(params.locale)) {
    return null;
  }

  const posts = getBlogPosts();

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />
      <main className="px-4 py-12 sm:py-16">
        <section className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            OldPhotoLive guides
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold text-[var(--color-text-primary)] sm:text-5xl">
            AI Photo Restoration Blog
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            Practical guides for restoring old family photos, colorizing black
            and white portraits, repairing damaged prints, and preparing images
            for animation.
          </p>

          <div className="mt-10 grid gap-5">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-6 transition-colors hover:border-[var(--color-accent)]/40"
              >
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {post.readingTime}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-[var(--color-accent)]"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {post.excerpt}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-[var(--color-accent)]/30 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-accent)]/10"
                >
                  Read guide
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <FooterSection />
    </div>
  );
}
