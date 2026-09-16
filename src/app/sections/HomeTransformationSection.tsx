import Image from "next/image";
import { SHOWCASE_SAMPLE_ASSETS } from "@/config/showcase-assets";
import { resolveShowcaseAssetUrl } from "@/config/showcase";

const SUBJECTS = ["1940s family portrait", "vintage wedding portrait", "old family snapshot", "historical portrait"] as const;

export default function HomeTransformationSection() {
  return (
    <section id="showcase-section" className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">See the Full Transformation</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {SHOWCASE_SAMPLE_ASSETS.slice(0, 4).map((sample, index) => (
            <article key={sample.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[["Original", sample.beforeKey], ["Restored", sample.restoredKey], ["Colorized", sample.colorizedKey]].map(([stage, key]) => (
                  <figure key={stage}>
                    <Image src={resolveShowcaseAssetUrl(key)} alt={`${stage.toLowerCase()} ${SUBJECTS[index]} photo — ${stage.toLowerCase()} stage`} width={320} height={400} loading="lazy" className="aspect-[4/5] w-full rounded-lg object-cover" />
                    <figcaption className="mt-2 text-center text-xs text-[var(--color-text-secondary)]">{stage}</figcaption>
                  </figure>
                ))}
                <figure>
                  <video controls loop muted playsInline preload="none" poster={resolveShowcaseAssetUrl(sample.colorizedKey)} width={320} height={400} aria-label={`animated ${SUBJECTS[index]} photo — subtle facial movement`} className="aspect-[4/5] w-full rounded-lg object-cover">
                    <source src={resolveShowcaseAssetUrl(sample.animationKey)} type="video/mp4" />
                  </video>
                  <figcaption className="mt-2 text-center text-xs text-[var(--color-text-secondary)]">Animated</figcaption>
                </figure>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
