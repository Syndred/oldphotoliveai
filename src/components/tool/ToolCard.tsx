import { Link } from "@/i18n/navigation";
import type { ToolPageDocument } from "@/content/tool-pages";

interface ToolCardProps {
  tool: ToolPageDocument;
}

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 transition-colors hover:border-[var(--color-accent)]/40">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
        {tool.eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold text-[var(--color-text-primary)]">
        <Link
          href={`/${tool.slug}`}
          className="hover:text-[var(--color-accent)]"
        >
          {tool.cardTitle}
        </Link>
      </h3>
      <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
        {tool.cardDescription}
      </p>
      <Link
        href={`/${tool.slug}`}
        className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-[var(--color-accent)]/30 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-accent)]/10"
      >
        Explore this workflow
      </Link>
    </article>
  );
}
