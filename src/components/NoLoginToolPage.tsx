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
  { question: "Can I upload a photo without login?", answer: "Yes. Choose and upload your photo first. Then sign in with Google and pay $1.99 before animation begins. Your upload is kept through sign-in." },
  { question: "Is photo animation free?", answer: "No. One photo with the selected tool costs $1.99, paid before processing. There is no subscription, and the complete result has no watermark." },
  { question: "What if processing fails?", answer: "A confirmed technical failure includes one free retry. If we confirm that the result cannot be delivered, we refund that purchase. Content violations follow our Terms; uncertain delivery needs support review." },
  { question: "What type of old photo works best?", answer: "Clear portraits, scanned family prints, wedding photos, and vintage studio portraits work best. Avoid tiny, blurry, or heavily cropped faces." },
  { question: "Can I download the video?", answer: "Yes. The completed paid result includes a watermark-free video download. Keep your original photo as well." },
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
    title: "Animate old photos with AI",
    body:
      "Animate a clear family portrait for $1.99, with no subscription.",
  },
  {
    href: "/bring-to-life",
    title: "Bring old photos to life",
    body:
      "Create a gentle memory video for family stories, slideshows, and memorials.",
  },
  {
    href: "/restore-old-photos",
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
        { name: "Upload an Old Photo Before Login", path: "/no-login" },
      ],
      locale
    ),
    buildFaqJsonLd(FAQS),
    buildSoftwareApplicationJsonLd({
      name: "Upload an Old Photo Before Login",
      description:
        "Upload a photo before login. Then sign in and pay $1.99 for a complete AI animation without a watermark.",
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
                  Upload before login
                </p>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-5xl">
                  Turn an Old Photo into a Video
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  Upload an old family photo first. Then sign in and pay $1.99 to
                  create a short AI video without a watermark. No subscription
                  or software installation needed.
                </p>

                <div className="mt-6 grid gap-3">
                  {[
                    "Choose and upload your photo before signing in.",
                    "Your photo stays selected through Google sign-in.",
                    "One photo, one selected tool: $1.99 before processing, no watermark.",
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
                    Upload your photo
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
                    An example AI animation from an old portrait photo.
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
                How photo processing works
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
                  title: "Sign in and pay $1.99",
                  body:
                    "Confirm your photo order and pay once. Animation starts after payment is confirmed.",
                },
                {
                  title: "Download your completed video",
                  body:
                    "Follow progress on the photo page, then download your completed result without a watermark.",
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
