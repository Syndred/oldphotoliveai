import UploadSection from "@/app/sections/UploadSection";
import { SHOWCASE_SAMPLE_ASSETS } from "@/config/showcase-assets";
import { resolveShowcaseAssetUrl } from "@/config/showcase";

const demo = SHOWCASE_SAMPLE_ASSETS[0];

export default function HomeAnimationHero() {
  return (
    <section id="hero-section" data-testid="hero-section" className="px-4 py-10 sm:py-16">
      <div className="mx-auto grid max-w-7xl items-stretch gap-8 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">Restore · Colorize · Animate</p>
          <h1 className="mt-4 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-5xl md:text-6xl">Bring Old Photos to Life with AI</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">Restore, colorize, and animate your old family photos — all in one place, with a free preview.</p>
          <div className="mt-7 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black/25 p-2">
            <video controls loop muted playsInline preload="none" poster={resolveShowcaseAssetUrl(demo.colorizedKey)} width={960} height={720} aria-label="AI animation demo of a restored and colorized old family photo" className="aspect-[4/3] w-full rounded-xl object-cover">
              <source src={resolveShowcaseAssetUrl(demo.animationKey)} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="grid grid-cols-4 gap-2 p-2 text-center text-xs text-[var(--color-text-secondary)]">
              {['Original', 'Restored', 'Colorized', 'Animated'].map((stage) => <span key={stage} className="rounded-lg border border-white/10 px-2 py-2">{stage}</span>)}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="mb-4 text-center text-2xl font-semibold text-[var(--color-text-primary)] lg:text-left">Upload an old photo and watch it come to life</h2>
          <UploadSection analyticsSource="home_hero" variant="embedded" showHeader={false} workflow="full" />
        </div>
      </div>
      <div className="mx-auto mt-8 grid max-w-6xl gap-3 border-y border-white/10 py-4 text-center text-sm text-[var(--color-text-secondary)] sm:grid-cols-3">
        <span>Photos brought to life every day</span>
        <span>Restore, colorize &amp; animate in one workflow</span>
        <span>Free account quota available</span>
      </div>
    </section>
  );
}
