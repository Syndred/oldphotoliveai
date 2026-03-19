import ToolCard from "@/components/tool/ToolCard";
import {
  TOOL_SECTION_COPY,
  getRelatedToolPages,
  getToolPageSummaries,
  type ToolPageSlug,
} from "@/content/tool-pages";

interface ToolCardsSectionProps {
  title?: string;
  description?: string;
  slugs?: ToolPageSlug[];
}

export default function ToolCardsSection({
  title = TOOL_SECTION_COPY.title,
  description = TOOL_SECTION_COPY.description,
  slugs,
}: ToolCardsSectionProps) {
  const tools = slugs ? getRelatedToolPages(slugs) : getToolPageSummaries();

  return (
    <section id="tool-pages-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            {TOOL_SECTION_COPY.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            {description}
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
