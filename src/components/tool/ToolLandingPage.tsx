import { COLORIZER_EXAMPLES } from "@/content/colorizer-examples";
import BeforeAfterCompare from "@/components/BeforeAfterCompare";
import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";
import ShowcaseSection from "@/app/sections/ShowcaseSection";
import VideoShowcaseSection from "@/app/sections/VideoShowcaseSection";
import HowItWorksSection from "@/app/sections/HowItWorksSection";
import FAQSection from "@/app/sections/FAQSection";
import UploadSection from "@/app/sections/UploadSection";
import ToolCardsSection from "@/components/tool/ToolCardsSection";
import {
  getToolPage,
  getToolPagePath,
  getToolSectionCopy,
  type ToolPageSlug,
} from "@/content/tool-pages";
import { Link } from "@/i18n/navigation";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import type { TaskWorkflow } from "@/types";
import { RESTORE_HOW_IT_WORKS } from "@/content/home-animation";
import { SHOWCASE_SAMPLE_ASSETS } from "@/config/showcase-assets";
import { resolveShowcaseAssetUrl } from "@/config/showcase";
import { MAX_FILE_SIZE } from "@/lib/validation";
import { RESOLUTION_CONFIG } from "@/types";

interface ToolLandingPageProps {
  locale: Locale;
  slug: ToolPageSlug;
}

const TOOL_WORKFLOWS: Record<ToolPageSlug, TaskWorkflow> = {
  "restore-old-photos": "restore",
  "colorize-old-photos": "colorize",
  "animate-old-photos": "animate",
  "repair-damaged-old-photos": "restore",
};

const COLORIZER_FORMATS = [
  {
    format: "JPG / JPEG",
    bestFor: "Scanned prints and camera photos",
    note: "Smaller files; use the highest-quality export available.",
  },
  {
    format: "PNG",
    bestFor: "Lossless scans and edited archive copies",
    note: "Preserves detail well, but files are often larger.",
  },
  {
    format: "WEBP",
    bestFor: "Modern web images and compact uploads",
    note: "Good quality at a smaller file size.",
  },
] as const;

const COLORIZER_DETAILS = {
  en: {
    title: "Photo formats, output, and processing",
    summary: "Check the supported file types, image limits, and delivery conditions before starting a colorization job.",
    formats: "Supported files",
    output: "Image resolution",
    outputBody: `Up to ${RESOLUTION_CONFIG.payAsYouGo.maxWidth} × ${RESOLUTION_CONFIG.payAsYouGo.maxHeight} pixels (2K), preserving aspect ratio. Smaller generated images are not enlarged; original scan resolution is not guaranteed.`,
    timing: "Processing time",
    timingBody: "Usually a few minutes. Image quality, provider availability, and queue demand can extend processing; this is not a guaranteed delivery time.",
    support: "Technical failures and refunds",
    supportBody: "One retry at no extra cost after a confirmed technical failure. A refund is issued if delivery is confirmed impossible. Content-policy rejections are not refunded; uncertain processing or payment states require review. Bank arrival times vary.",
    formatBody: `JPEG / JPG, PNG, and WebP, up to ${MAX_FILE_SIZE / (1024 * 1024)} MB per photo. Use a clear scan with minimal glare or compression.`,
  },
  zh: {
    title: "支持格式、输出与处理说明",
    summary: "开始上色前，请确认支持的文件类型、图片上限和交付条件。",
    formats: "支持文件",
    output: "图片分辨率",
    outputBody: `最高 ${RESOLUTION_CONFIG.payAsYouGo.maxWidth} × ${RESOLUTION_CONFIG.payAsYouGo.maxHeight} 像素（2K），保留原比例。生成图片较小时不会放大，不保证保留扫描原图的全部分辨率。`,
    timing: "处理时长",
    timingBody: "通常需要数分钟。原图质量、服务可用性和排队情况可能延长处理，这不是保证交付时间。",
    support: "技术失败与退款",
    supportBody: "确认技术失败后可免额外费用重试一次；确认无法交付时退款。内容违规拒绝不退款，处理或付款状态不明确时须先核对。银行到账时间可能不同。",
    formatBody: `JPEG / JPG、PNG、WebP，单张最大 ${MAX_FILE_SIZE / (1024 * 1024)} MB。建议使用清晰扫描件，避免反光和重度压缩。`,
  },
} as const;

export default function ToolLandingPage({
  locale,
  slug,
}: ToolLandingPageProps) {
  const isEnglishColorizer = locale === "en" && slug === "colorize-old-photos";
  const isColorizer = slug === "colorize-old-photos";
  const colorizerDetails = locale === "zh" ? COLORIZER_DETAILS.zh : COLORIZER_DETAILS.en;
  const tool = getToolPage(locale, slug);
  const toolPath = getToolPagePath(slug);
  const sectionCopy = getToolSectionCopy(locale);

  const jsonLd = [
    buildBreadcrumbJsonLd(
      [
        { name: sectionCopy.homeLabel, path: "/" },
        { name: tool.cardTitle, path: toolPath },
      ],
      locale
    ),
    buildFaqJsonLd(tool.faqs),
    buildSoftwareApplicationJsonLd({
      name: tool.cardTitle,
      description: tool.description,
      path: toolPath,
      locale,
      keywords: tool.keywords,
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
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[var(--color-text-secondary)]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-white">
                    {sectionCopy.homeLabel}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-[var(--color-text-primary)]">
                  {tool.cardTitle}
                </li>
              </ol>
            </nav>
            <div className="grid items-stretch gap-8 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="flex h-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  {tool.eyebrow}
                </p>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-5xl">
                  {tool.heroTitle}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  {tool.heroDescription}
                </p>

                <div className="mt-6 grid gap-3">
                  {tool.heroHighlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-[var(--color-text-secondary)]"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>

              <UploadSection
                analyticsSource={tool.slug}
                variant="embedded"
                showHeader={false}
                className="h-full"
                workflow={TOOL_WORKFLOWS[tool.slug]}
              />
            </div>

            <nav
              aria-label={`${tool.cardTitle} page sections`}
              className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5"
            >
              <a
                href="#upload-section"
                className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[#17130a] transition-colors hover:bg-[var(--color-accent)]/90"
              >
                {tool.primaryCtaLabel}
              </a>
              <a
                href="#showcase-section"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {tool.showcaseTitle}
              </a>
              <a
                href="#faq-section"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {tool.faqTitle}
              </a>
              <a
                href="#tool-pages-section"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {tool.relatedTitle}
              </a>
              <Link
                href="/pricing"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-white/[0.05]"
              >
                {sectionCopy.seePricingLabel}
              </Link>
            </nav>
          </div>
        </section>

        {isEnglishColorizer ? (
          <section id="showcase-section" className="px-4 py-10 sm:py-14">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">{tool.showcaseTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">{tool.showcaseSubtitle}</p>
              <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.05fr,0.95fr]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                  <BeforeAfterCompare
                    beforeUrl={resolveShowcaseAssetUrl(SHOWCASE_SAMPLE_ASSETS[0].beforeKey)}
                    afterUrl={resolveShowcaseAssetUrl(SHOWCASE_SAMPLE_ASSETS[0].colorizedKey)}
                    beforeAlt="Black-and-white family photograph before AI photo colorization"
                    afterAlt="AI-colorized copy of the family photograph with estimated color"
                  />
                </div>
                <div className="grid gap-4">
                  {COLORIZER_EXAMPLES.map((example) => (
                    <article key={example.title} className="rounded-2xl border border-white/10 p-5">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{example.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{example.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : tool.showcaseKind === "animation" ? (
          <VideoShowcaseSection
            title={tool.showcaseTitle}
            subtitle={tool.showcaseSubtitle}
          />
        ) : (
          <ShowcaseSection
            title={tool.showcaseTitle}
            rowIds={[tool.showcaseKind]}
            description={tool.showcaseSubtitle}
          />
        )}

        <section className="px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                {tool.benefitsTitle}
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {tool.benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5"
                >
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {(locale === "en" || (locale === "zh" && isColorizer)) && tool.guideSections?.length ? (
          <section className="px-4 py-10 sm:py-14">
            <div className="mx-auto max-w-5xl">
              <div className="space-y-8">
                {tool.guideSections.map((section) => (
                  <article key={section.title}>
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                      {section.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                      {section.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!isColorizer && (
          <HowItWorksSection
            copy={
              locale === "en" && slug === "restore-old-photos"
                ? RESTORE_HOW_IT_WORKS
                : undefined
            }
          />
        )}

        {isColorizer ? (
          <section className="px-4 py-10 sm:py-14">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
                {colorizerDetails.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {colorizerDetails.summary}
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  [colorizerDetails.output, colorizerDetails.outputBody],
                  [colorizerDetails.timing, colorizerDetails.timingBody],
                  [colorizerDetails.formats, colorizerDetails.formatBody],
                  [colorizerDetails.support, colorizerDetails.supportBody],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <dt className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</dt>
                    <dd className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{body}</dd>
                  </div>
                ))}
              </dl>
              {locale === "en" ? <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-white/[0.05] text-[var(--color-text-primary)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold" scope="col">Format</th>
                      <th className="px-5 py-4 font-semibold" scope="col">Best for</th>
                      <th className="px-5 py-4 font-semibold" scope="col">What to know</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-[var(--color-text-secondary)]">
                    {COLORIZER_FORMATS.map((item) => (
                      <tr key={item.format}>
                        <th className="px-5 py-4 font-medium text-[var(--color-text-primary)]" scope="row">{item.format}</th>
                        <td className="px-5 py-4">{item.bestFor}</td>
                        <td className="px-5 py-4">{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div> : null}
            </div>
          </section>
        ) : null}

        <section className="px-4 py-4 sm:py-6">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {tool.introTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {tool.introBody}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 p-6">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {tool.pricingTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {tool.pricingBody}
              </p>
              <Link
                href="/pricing"
                className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-[var(--color-accent)]/30 bg-black/15 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)]/50 hover:bg-black/25"
              >
                {sectionCopy.comparePlansLabel}
              </Link>
            </div>
          </div>
        </section>

        <FAQSection title={tool.faqTitle} items={tool.faqs} />

        <ToolCardsSection
          locale={locale}
          title={tool.relatedTitle}
          description={tool.relatedDescription}
          slugs={tool.relatedSlugs}
        />
      </main>

      <FooterSection />
    </div>
  );
}
