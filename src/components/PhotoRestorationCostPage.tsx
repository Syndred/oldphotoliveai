import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import FAQSection from "@/app/sections/FAQSection";
import { Link } from "@/i18n/navigation";
import { PHOTO_RESTORATION_COST as content } from "@/content/photo-restoration-cost";
import { absoluteLocalizedUrl, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo";

// Uses the existing blog article layout, FAQ component, and site navigation.
export default function PhotoRestorationCostPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: content.title,
      description: content.description,
      mainEntityOfPage: absoluteLocalizedUrl("en", content.path),
      author: { "@type": "Organization", name: "OldPhotoLive AI" },
      publisher: { "@type": "Organization", name: "OldPhotoLive AI" },
    },
    buildBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Photo restoration cost", path: content.path }], "en"),
    buildFaqJsonLd([...content.faqs]),
  ];

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="px-4 py-12 sm:py-16">
        <article className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent)]/85">Home</Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">{content.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-5xl">{content.heading}</h1>
          <p className="mt-5 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">{content.introduction}</p>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">AI per-photo pricing vs a manual studio quote</h2>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-[var(--color-text-primary)]">
                  <tr>{["Method", "Price", "What is included", "Before choosing"].map((heading) => <th key={heading} scope="col" className="px-5 py-4 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-[var(--color-text-secondary)]">
                  {content.comparison.map((row) => (
                    <tr key={row.method}>
                      <th scope="row" className="px-5 py-4 align-top font-medium text-[var(--color-text-primary)]">{row.method}</th>
                      <td className="px-5 py-4 align-top leading-6">{row.price}</td>
                      <td className="px-5 py-4 align-top leading-6">{row.includes}</td>
                      <td className="px-5 py-4 align-top leading-6">{row.considerations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">On a small screen, scroll the table to compare each deliverable and condition.</p>
          </section>

          <div className="mt-10 space-y-10">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Choose the workflow your photo needs</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">Compare the price and output limits, then select restoration or colorization for your photograph.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/pricing" className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[#17130a] hover:bg-[var(--color-accent)]/90">View pricing</Link>
              <Link href="/restore-old-photos" className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]">Restore a photo</Link>
              <Link href="/colorize-old-photos" className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]">Colorize a photo</Link>
            </div>
          </section>
        </article>
        <FAQSection title="Photo restoration cost: common questions" items={[...content.faqs]} />
      </main>
      <FooterSection />
    </div>
  );
}
