import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import FAQSection from "@/app/sections/FAQSection";
import VideoPlayer from "@/components/VideoPlayer";
import AnonymousUploadSection from "@/components/AnonymousUploadSection";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_SAMPLE_ASSETS } from "@/config/showcase-assets";
import { buildCdnUrl } from "@/lib/url";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

const FAQS = [
  {
    question: "Can I turn an old photo into a video without login?",
    answer:
      "Yes. Upload one old photo and OldPhotoLive AI will create a free watermarked video preview without asking you to create an account first.",
  },
  {
    question: "Is the no-login old photo to video AI preview free?",
    answer:
      "The no-login preview is free for one experience. It is designed as a lightweight sample with lower resolution and an OldPhotoLive AI watermark.",
  },
  {
    question: "What happens after my free no-login preview?",
    answer:
      "After the preview is ready, you can sign up if you want HD exports, more animations, and saved task history.",
  },
  {
    question: "What type of old photo works best?",
    answer:
      "Clear portrait photos, scanned family prints, wedding photos, memorial pictures, and vintage studio portraits usually work best. Avoid tiny, blurry, or heavily cropped faces.",
  },
  {
    question: "Will my free preview include a watermark?",
    answer:
      "Yes. The no-login version outputs a watermarked, lower-resolution preview. Sign up when you want HD output without the free-preview limits.",
  },
];

const RELATED_TOOLS = [
  {
    href: "/to-video",
    title: "Old photo to video AI",
    body:
      "Use the full online photo-to-video workflow when you want more export options.",
  },
  {
    href: "/animate",
    title: "Animate old photos online",
    body:
      "Use the full AI animation workflow when you want more control and saved results.",
  },
  {
    href: "/animate-free",
    title: "Animate old photos with AI free",
    body:
      "Start a free AI animation preview from a clear old family portrait.",
  },
  {
    href: "/bring-to-life",
    title: "Bring old photos to life",
    body:
      "Create a gentle memory video for family stories, slideshows, and memorials.",
  },
  {
    href: "/restore",
    title: "Restore old photos before animation",
    body:
      "Clean fading, scratches, and soft details before creating a more natural video.",
  },
];

interface NoLoginToolPageProps {
  locale: Locale;
}

export default function NoLoginToolPage({ locale }: NoLoginToolPageProps) {
  const videoSamples = SHOWCASE_SAMPLE_ASSETS.slice(0, 3);
  const jsonLd = [
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "Old Photo to Video AI Free Without Login", path: "/no-login" },
      ],
      locale
    ),
    buildFaqJsonLd(FAQS),
    buildSoftwareApplicationJsonLd({
      name: "Old Photo to Video AI Free Without Login",
      description:
        "Turn old photos into videos with AI free without login. No sign-up needed for one watermarked preview.",
      path: "/no-login",
      locale,
      keywords: [
        "old photo to video AI free without login",
        "old photo animation no sign up",
        "animate old photos online free",
      ],
      price: "0.00",
    }),
  ];

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main>
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] px-5 py-8 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:px-8 sm:py-10">
            <div className="grid items-stretch gap-8 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="flex h-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  No-login AI animation
                </p>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-5xl">
                  Old Photo to Video AI Free Without Login
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  Upload an old family photo and turn it into a short AI video
                  preview online. No account needed, no sign-up wall before the
                  first result, and no software to install.
                </p>

                <div className="mt-6 grid gap-3">
                  {[
                    "No account needed: upload a photo and start the animation directly.",
                    "Instant result flow: stay on the page while your preview task is created.",
                    "Free preview terms: one watermarked, lower-resolution video experience.",
                  ].map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-[var(--color-text-secondary)]"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href="#upload-section"
                    className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
                  >
                    Try free without login
                  </a>
                  <a
                    href="#examples"
                    className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
                  >
                    See video examples
                  </a>
                </div>
              </div>

              <AnonymousUploadSection />
            </div>
          </div>
        </section>

        <section id="examples" className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                Old photo to video examples
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                Three sample animations show the kind of subtle motion a clear
                portrait can become: face movement, gentle depth, and a short
                memory-video feel.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {videoSamples.map((sample, index) => (
                <article
                  key={sample.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-3"
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-xl bg-black/20">
                    <VideoPlayer
                      src={buildCdnUrl(sample.animationKey)}
                      containerClassName="h-full"
                      videoClassName="h-full w-full object-cover"
                      showWatermark
                    />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">
                    Preview example {index + 1}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    A watermarked AI video preview from an old portrait photo.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                How the free no-login version works
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Upload one old photo",
                  body:
                    "Choose a clear portrait, scanned family print, or vintage photo. JPG, PNG, and WebP uploads are supported.",
                },
                {
                  title: "AI creates a preview",
                  body:
                    "OldPhotoLive AI restores the source enough for animation, then generates a short watermarked video preview.",
                },
                {
                  title: "Upgrade only after seeing it",
                  body:
                    "After the preview, sign up only if you want HD quality, more animations, downloads, and saved history.",
                },
              ].map((step) => (
                <article
                  key={step.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5"
                >
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <FAQSection
          title="Questions about old photo to video AI without login"
          items={FAQS}
        />

        <section id="tool-pages-section" className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                Related tools
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                Keep improving the same old photo
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                Use these AI photo tools when you want a cleaner, more colorful
                source before making the final video.
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
                    {tool.body}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
