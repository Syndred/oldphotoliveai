import ToolCard from "@/components/tool/ToolCard";
import {
  getToolSectionCopy,
  getRelatedToolPages,
  getToolPageSummaries,
  type ToolPageSlug,
} from "@/content/tool-pages";
import { defaultLocale, type Locale } from "@/i18n/routing";

interface ToolCardsSectionProps {
  locale?: Locale;
  title?: string;
  description?: string;
  slugs?: ToolPageSlug[];
}

export default function ToolCardsSection({
  locale = defaultLocale,
  title,
  description,
  slugs,
}: ToolCardsSectionProps) {
  const sectionCopy = getToolSectionCopy(locale);
  const tools = slugs
    ? getRelatedToolPages(locale, slugs)
    : getToolPageSummaries(locale);

  return (
    <section id="tool-pages-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            {sectionCopy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
            {title ?? sectionCopy.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            {description ?? sectionCopy.description}
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              exploreLabel={sectionCopy.exploreWorkflowLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
