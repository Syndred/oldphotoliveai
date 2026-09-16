import { HOME_USE_CASES } from "@/content/home-animation";

export default function HomeUseCasesSection() {
  return (
    <section className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">Made for Old Family Photos</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_USE_CASES.map(([title, description], index) => (
            <article key={title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-sm font-bold text-[var(--color-accent)]">{index + 1}</div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
