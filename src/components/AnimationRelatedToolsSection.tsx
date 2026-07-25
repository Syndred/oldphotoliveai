import { Link } from "@/i18n/navigation";

const RELATED_TOOLS = [
  {
    href: "/no-login",
    title: "No-login photo to video",
    description:
      "Create one watermarked, lower-resolution old-photo video preview with no account.",
  },
  {
    href: "/to-video",
    title: "Old photo to video AI",
    description:
      "Convert a clear portrait into a short AI video online and review the motion first.",
  },
  {
    href: "/bring-to-life",
    title: "Bring old photos to life",
    description:
      "Turn a meaningful family portrait into a gentle memory video with AI.",
  },
];

export default function AnimationRelatedToolsSection() {
  return (
    <section className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Related tools
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
            Create a moving memory from an old photo
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            Choose the workflow that matches the result you want, from a no-login preview to a finished photo-to-video animation.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {RELATED_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.04]"
            >
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {tool.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
