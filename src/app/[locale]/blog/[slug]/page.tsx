import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import {
  getBlogDateLocale,
  getBlogPost,
  getBlogPostSlugs,
} from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { isValidLocale, type Locale } from "@/i18n/routing";
import {
  absoluteLocalizedUrl,
  buildFaqJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";

interface BlogPostPageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: BlogPostPageProps): Metadata {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const post = getBlogPost(locale, params.slug);

  if (!post) {
    return {};
  }

  return buildLocalizedPageMetadata({
    locale,
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    section: "AI photo restoration",
  });
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const locale = (isValidLocale(params.locale) ? params.locale : "en") as Locale;
  const post = getBlogPost(locale, params.slug);

  if (!post) {
    notFound();
  }
  const dateLocale = getBlogDateLocale(locale);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: "OldPhotoLive AI",
    },
    publisher: {
      "@type": "Organization",
      name: "OldPhotoLive AI",
    },
    mainEntityOfPage: absoluteLocalizedUrl(locale, `/blog/${post.slug}`),
    keywords: post.keywords.join(", "),
  };

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([articleJsonLd, buildFaqJsonLd(post.faqs)]),
        }}
      />
      <Navbar />
      <main className="px-4 py-12 sm:py-16">
        <article className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent)]/85"
          >
            {post.backLabel}
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            {post.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            {post.description}
          </p>
          <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
            {new Date(post.publishedAt).toLocaleDateString(dateLocale, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {post.readingTime}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={post.primaryToolPath}
              className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
            >
              {post.primaryToolLabel}
            </Link>
            <Link
              href={post.secondaryToolPath}
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
            >
              {post.secondaryToolLabel}
            </Link>
          </div>

          <div className="mt-10 space-y-10">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {post.faqTitle}
            </h2>
            <div className="mt-5 space-y-5">
              {post.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </main>
      <FooterSection />
    </div>
  );
}
