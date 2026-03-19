import type { Locale } from "@/i18n/routing";
import { TOOL_PAGE_TRANSLATIONS_ZH } from "./tool-pages.zh";
import { TOOL_PAGE_TRANSLATIONS_ES } from "./tool-pages.es";
import { TOOL_PAGE_TRANSLATIONS_JA } from "./tool-pages.ja";

export const TOOL_PAGE_SLUGS = [
  "restore-old-photos",
  "colorize-old-photos",
  "animate-old-photos",
  "repair-damaged-old-photos",
] as const;

export type ToolPageSlug = (typeof TOOL_PAGE_SLUGS)[number];

export type ToolShowcaseKind = "restoration" | "colorization" | "animation";

export interface ToolBenefit {
  title: string;
  body: string;
}

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolPageDocument {
  slug: ToolPageSlug;
  title: string;
  description: string;
  keywords: string[];
  cardTitle: string;
  cardDescription: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroHighlights: string[];
  primaryCtaLabel: string;
  uploadTitle: string;
  uploadSubtitle: string;
  introTitle: string;
  introBody: string;
  showcaseTitle: string;
  showcaseSubtitle: string;
  showcaseKind: ToolShowcaseKind;
  benefitsTitle: string;
  benefits: ToolBenefit[];
  pricingTitle: string;
  pricingBody: string;
  faqTitle: string;
  faqs: ToolFaq[];
  relatedTitle: string;
  relatedDescription: string;
  relatedSlugs: ToolPageSlug[];
}

export type LocalizedToolPageDocument = Omit<
  ToolPageDocument,
  "slug" | "showcaseKind" | "relatedSlugs"
>;

export type TranslatedLocale = Exclude<Locale, "en">;

export interface ToolSectionCopy {
  eyebrow: string;
  title: string;
  description: string;
  exploreWorkflowLabel: string;
  seePricingLabel: string;
  comparePlansLabel: string;
  homeLabel: string;
}

const TOOL_SECTION_COPY_BY_LOCALE: Record<Locale, ToolSectionCopy> = {
  en: {
    eyebrow: "Tool pages",
    title: "Focused landing pages for each old-photo workflow",
    description:
      "Each page is built to match a specific search intent while still feeding the same upload flow, credit model, and pricing system.",
    exploreWorkflowLabel: "Explore this workflow",
    seePricingLabel: "See pricing",
    comparePlansLabel: "Compare plans",
    homeLabel: "Home",
  },
  zh: {
    eyebrow: "工具落地页",
    title: "为旧照片工作流拆成更聚焦的落地页",
    description:
      "每个页面都对应更明确的搜索意图，但仍共用同一套上传流程、积分体系和价格系统。",
    exploreWorkflowLabel: "查看这个工作流",
    seePricingLabel: "查看价格",
    comparePlansLabel: "比较方案",
    homeLabel: "首页",
  },
  es: {
    eyebrow: "Páginas de herramienta",
    title: "Landing pages enfocadas para cada flujo de fotos antiguas",
    description:
      "Cada página responde a una intención de búsqueda concreta, pero mantiene el mismo flujo de subida, créditos y precios.",
    exploreWorkflowLabel: "Ver este flujo",
    seePricingLabel: "Ver precios",
    comparePlansLabel: "Comparar planes",
    homeLabel: "Inicio",
  },
  ja: {
    eyebrow: "ツールページ",
    title: "旧写真ワークフローごとの専用ランディングページ",
    description:
      "各ページは異なる検索意図に合わせつつ、アップロード導線、クレジット、料金体系は共通のままです。",
    exploreWorkflowLabel: "このワークフローを見る",
    seePricingLabel: "料金を見る",
    comparePlansLabel: "プランを比較",
    homeLabel: "ホーム",
  },
};

const TOOL_PAGE_TRANSLATIONS: Record<
  TranslatedLocale,
  Record<ToolPageSlug, LocalizedToolPageDocument>
> = {
  zh: TOOL_PAGE_TRANSLATIONS_ZH,
  es: TOOL_PAGE_TRANSLATIONS_ES,
  ja: TOOL_PAGE_TRANSLATIONS_JA,
};

const TOOL_PAGES_EN: Record<ToolPageSlug, ToolPageDocument> = {
  "restore-old-photos": {
    slug: "restore-old-photos",
    title: "Restore Old Photos Online with AI",
    description:
      "Restore old photos online with AI. Repair faded prints, recover facial details, clean scratches, and bring family memories back with one upload.",
    keywords: [
      "restore old photos",
      "restore old photos online",
      "old photo restoration",
      "ai photo restoration",
    ],
    cardTitle: "Restore old photos",
    cardDescription:
      "Repair faded family prints, recover details, and produce a cleaner master image before color and animation.",
    eyebrow: "AI restoration",
    heroTitle: "Restore old photos without rebuilding the image by hand",
    heroDescription:
      "Upload one damaged family photo and let the same workflow restore detail, improve contrast, and prepare the image for color and animation.",
    heroHighlights: [
      "Repair faded prints and low-contrast scans",
      "Recover faces, clothing texture, and background detail",
      "Use one shared credit system across every workflow",
    ],
    primaryCtaLabel: "Restore a photo now",
    uploadTitle: "Upload a photo to restore",
    uploadSubtitle:
      "Start with one upload and get restoration, colorization, and animation from the same workflow.",
    introTitle: "Why this page exists",
    introBody:
      "People searching for old photo restoration usually want the fastest path from a damaged scan to a usable result. This page keeps the promise simple: upload, let AI repair the image, then continue into the same product if you also want color and motion.",
    showcaseTitle: "Old photo restoration examples",
    showcaseSubtitle:
      "Real before-and-after examples focused on contrast recovery, scratch cleanup, and facial detail repair.",
    showcaseKind: "restoration",
    benefitsTitle: "What this workflow is best at",
    benefits: [
      {
        title: "Repair the obvious damage first",
        body:
          "Use AI to handle fading, washed-out contrast, small scratches, and soft facial detail before you spend time on manual retouching.",
      },
      {
        title: "Keep the same job in one product",
        body:
          "You do not need a separate tool for restoration, a different one for colorization, and a third one for animation. The workflow stays connected.",
      },
      {
        title: "Give old family archives a faster first pass",
        body:
          "When you have many photos to process, restoration pages like this help turn a broad demand into a focused conversion path.",
      },
    ],
    pricingTitle: "One pricing model across every old-photo workflow",
    pricingBody:
      "This page does not create a separate product. Restore, colorize, and animate with the same credits or subscription, then choose the plan that fits your volume.",
    faqTitle: "Questions about restoring old photos",
    faqs: [
      {
        question: "Does this page use a different checkout from the rest of the site?",
        answer:
          "No. This landing page is only a focused search entry point. It still uses the same credit system, pricing page, and Stripe checkout as the rest of the product.",
      },
      {
        question: "Do I need Photoshop before using this workflow?",
        answer:
          "No. The page is designed for users who want a faster AI-assisted first pass. You can still export the result and refine it manually later if needed.",
      },
      {
        question: "What kinds of photos work best?",
        answer:
          "Portraits, family snapshots, wedding prints, and moderately damaged scans usually benefit most. A cleaner scan gives the model more detail to work with.",
      },
      {
        question: "Will the workflow also colorize and animate my result?",
        answer:
          "Yes. The product pipeline still supports restoration, colorization, and animation together. This page simply frames the first promise around restoration.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "If the visitor intent is narrower than general restoration, route them into a more specific page instead of forcing every query through the homepage.",
    relatedSlugs: [
      "repair-damaged-old-photos",
      "colorize-old-photos",
      "animate-old-photos",
    ],
  },
  "colorize-old-photos": {
    slug: "colorize-old-photos",
    title: "Colorize Old Photos with AI",
    description:
      "Colorize old photos with AI. Turn black-and-white family pictures into natural-looking color while keeping the same restoration workflow and pricing.",
    keywords: [
      "colorize old photos",
      "old photo colorizer",
      "black and white photo colorizer",
      "ai photo colorization",
    ],
    cardTitle: "Colorize old photos",
    cardDescription:
      "Turn black-and-white memories into natural color without leaving the same restoration and export workflow.",
    eyebrow: "AI colorization",
    heroTitle: "Colorize black-and-white family photos in the same workflow",
    heroDescription:
      "This page targets colorization intent, but the product still starts with cleanup and restoration so the final image looks stronger before color is added.",
    heroHighlights: [
      "Bring black-and-white portraits into natural color",
      "Start from a restored base instead of coloring damage",
      "Keep the same credits, plans, and checkout",
    ],
    primaryCtaLabel: "Colorize a photo now",
    uploadTitle: "Upload a photo to colorize",
    uploadSubtitle:
      "Your upload still goes through the same old-photo pipeline so the final color result starts from a cleaner image.",
    introTitle: "Why this page exists",
    introBody:
      "A user searching for old photo colorization is usually less interested in generic restoration copy and more interested in how quickly a grayscale family image can look vivid again. This page makes that promise obvious without changing the underlying product model.",
    showcaseTitle: "Old photo colorization examples",
    showcaseSubtitle:
      "Before-and-after examples focused on natural skin tones, clothing, and environmental color in family photos.",
    showcaseKind: "colorization",
    benefitsTitle: "What this workflow is best at",
    benefits: [
      {
        title: "Add believable color, not oversaturated noise",
        body:
          "The goal is not just color for its own sake. Good colorization should look plausible enough that the memory feels intact.",
      },
      {
        title: "Start with a cleaner source image",
        body:
          "Because the same pipeline repairs the image first, color is added to a stronger base instead of a faded, scratch-heavy original.",
      },
      {
        title: "Serve a narrower search intent",
        body:
          "Dedicated tool pages like this usually convert better than a single generic homepage for people who already know they want colorization.",
      },
    ],
    pricingTitle: "Colorization still uses the same credits and plans",
    pricingBody:
      "You do not need a separate subscription for colorization. The product keeps one shared pricing model across restoration, colorization, and animation workflows.",
    faqTitle: "Questions about colorizing old photos",
    faqs: [
      {
        question: "Do I need a separate plan just for colorization?",
        answer:
          "No. This page is a targeted landing page, not a standalone product. The same credits and subscription apply everywhere on the site.",
      },
      {
        question: "Will the workflow repair the photo before adding color?",
        answer:
          "Yes. The pipeline still restores the image first so the final color result has cleaner structure and fewer visible defects.",
      },
      {
        question: "Can I still download the final image and animation result?",
        answer:
          "Yes. The checkout and result flow stay the same. This page only changes how the visitor enters the product.",
      },
      {
        question: "What kind of source photos work well here?",
        answer:
          "Black-and-white portraits, family snapshots, and moderately faded prints usually perform best. A better scan usually leads to better color decisions.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "Cross-link tightly to sibling pages so colorization traffic can continue into restoration, repair, or animation without dead ends.",
    relatedSlugs: [
      "restore-old-photos",
      "repair-damaged-old-photos",
      "animate-old-photos",
    ],
  },
  "animate-old-photos": {
    slug: "animate-old-photos",
    title: "Animate Old Photos with AI",
    description:
      "Animate old photos with AI. Turn restored portraits into short video clips with subtle motion while keeping the same credits, checkout, and result flow.",
    keywords: [
      "animate old photos",
      "old photo animation",
      "bring old photos to life",
      "animate family photos",
    ],
    cardTitle: "Animate old photos",
    cardDescription:
      "Turn a restored portrait into a short moving clip without switching to a separate product or pricing system.",
    eyebrow: "AI animation",
    heroTitle: "Animate old photos after they have been cleaned and restored",
    heroDescription:
      "This page is built for visitors who already know they want motion. It still uses the same upload pipeline so the portrait is repaired and colorized before animation output is generated.",
    heroHighlights: [
      "Create short portrait animations from one upload",
      "Use a repaired and colorized frame as the animation base",
      "Keep animation inside the same credit and subscription model",
    ],
    primaryCtaLabel: "Animate a photo now",
    uploadTitle: "Upload a photo to animate",
    uploadSubtitle:
      "One upload still powers restoration, colorization, and animation together, even when the page intent is focused on motion.",
    introTitle: "Why this page exists",
    introBody:
      "Visitors searching for animated old photos usually want proof that the product can generate a believable clip, not another general explanation about photo restoration. This landing page shifts the emphasis to motion while still truthfully describing the same end-to-end workflow.",
    showcaseTitle: "Animated old photo examples",
    showcaseSubtitle:
      "Short motion examples based on restored family portraits and old photographs.",
    showcaseKind: "animation",
    benefitsTitle: "What this workflow is best at",
    benefits: [
      {
        title: "Lead with motion instead of generic restoration copy",
        body:
          "Animation visitors are already deeper in the funnel. They need proof that the end result looks alive without feeling distorted.",
      },
      {
        title: "Use the same pipeline as every other page",
        body:
          "Animation is not sold as a separate product line here. It stays inside the same upload flow, checkout logic, and result system.",
      },
      {
        title: "Use one page to capture a high-intent query",
        body:
          "Focused pages give search traffic a cleaner promise and reduce the mismatch between keyword intent and landing experience.",
      },
    ],
    pricingTitle: "Animation still sits inside the same product",
    pricingBody:
      "This page does not split animation into a different pricing structure. Users still buy credits or a subscription inside the same unified billing model.",
    faqTitle: "Questions about animating old photos",
    faqs: [
      {
        question: "Is animation sold as a separate product?",
        answer:
          "No. This page is only a specialized landing page for search intent. The billing and checkout flow remain shared with restoration and colorization.",
      },
      {
        question: "Does the workflow still restore the image first?",
        answer:
          "Yes. The pipeline still repairs and improves the image before generating the animation result, which usually produces a stronger final clip.",
      },
      {
        question: "What kind of photos animate best?",
        answer:
          "Portraits with a visible face usually work best because subtle motion reads more clearly when the subject is centered and reasonably sharp.",
      },
      {
        question: "Can I use the same credits on other pages too?",
        answer:
          "Yes. The same credits and plans apply across the entire site. These pages are separate landing experiences, not separate wallets.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "Visitors looking for motion often still need restoration or color help. Keep the sibling pages tightly connected so the session can continue.",
    relatedSlugs: [
      "restore-old-photos",
      "colorize-old-photos",
      "repair-damaged-old-photos",
    ],
  },
  "repair-damaged-old-photos": {
    slug: "repair-damaged-old-photos",
    title: "Repair Damaged Old Photos with AI",
    description:
      "Repair damaged old photos with AI. Clean scratches, faded contrast, dust, and worn paper while staying inside the same restoration, colorization, and animation workflow.",
    keywords: [
      "repair damaged old photos",
      "fix faded old photos",
      "repair scratched photos",
      "repair damaged family photos",
    ],
    cardTitle: "Repair damaged old photos",
    cardDescription:
      "Speak directly to scratched, faded, and yellowed photo intent while still using the same upload and billing flow.",
    eyebrow: "Damage repair",
    heroTitle: "Repair scratches, fading, and damage in old family photos",
    heroDescription:
      "This page narrows the promise to physical damage repair so visitors know the product is built for worn prints, not only clean black-and-white portraits.",
    heroHighlights: [
      "Fix scratches, dust marks, folds, and washed-out contrast",
      "Use the same upload workflow as every other page",
      "Keep one shared credit wallet for the full product",
    ],
    primaryCtaLabel: "Repair a damaged photo",
    uploadTitle: "Upload a damaged photo",
    uploadSubtitle:
      "Start with one upload and let the same pipeline repair the image before color and animation outputs are generated.",
    introTitle: "Why this page exists",
    introBody:
      "Some visitors are not searching for general restoration. They are describing a very specific problem: scratches, fading, yellowing, and paper damage. This page makes the problem statement explicit so the landing experience feels closer to the search term.",
    showcaseTitle: "Damage repair examples",
    showcaseSubtitle:
      "Examples focused on faded contrast, visible surface defects, and common family-photo wear.",
    showcaseKind: "restoration",
    benefitsTitle: "What this workflow is best at",
    benefits: [
      {
        title: "Match the language users actually search",
        body:
          "A dedicated repair page lines up better with terms like faded, scratched, damaged, or worn photo repair than a broad homepage ever will.",
      },
      {
        title: "Repair before you decide on manual work",
        body:
          "Use AI to take the first pass on repetitive damage so you only hand-edit the special cases that truly need it.",
      },
      {
        title: "Keep the same conversion path",
        body:
          "The landing page is specific, but the business model stays unified. Same credits, same checkout, same result screen.",
      },
    ],
    pricingTitle: "Repair pages do not require separate billing logic",
    pricingBody:
      "This page is designed for search intent, not a new pricing tier. Keep the same plans and let the user enter the shared workflow from a more precise page.",
    faqTitle: "Questions about repairing damaged old photos",
    faqs: [
      {
        question: "Is this a different tool from the restoration page?",
        answer:
          "Not at the billing level. It is a more focused entry page for visitors whose search intent is specifically about damage repair rather than general restoration.",
      },
      {
        question: "What types of damage are usually fixable?",
        answer:
          "Fading, low contrast, dust, scratches, and moderate surface wear are the most common cases. Very severe loss of detail may still need manual retouching after the AI pass.",
      },
      {
        question: "Will the same workflow also colorize and animate the photo?",
        answer:
          "Yes. The workflow remains the same end to end. This page simply frames the offer around repair intent first.",
      },
      {
        question: "Do I need to buy a special damage-repair package?",
        answer:
          "No. The same credits and subscription plans apply throughout the site.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "Use related tool pages to move users from a narrow problem statement into the broader product journey without forcing a generic homepage detour.",
    relatedSlugs: [
      "restore-old-photos",
      "colorize-old-photos",
      "animate-old-photos",
    ],
  },
};

export function isToolPageSlug(value: string): value is ToolPageSlug {
  return (TOOL_PAGE_SLUGS as readonly string[]).includes(value);
}

export function getToolSectionCopy(locale: Locale): ToolSectionCopy {
  return TOOL_SECTION_COPY_BY_LOCALE[locale] ?? TOOL_SECTION_COPY_BY_LOCALE.en;
}

export function getToolPage(
  locale: Locale,
  slug: ToolPageSlug
): ToolPageDocument {
  const basePage = TOOL_PAGES_EN[slug];

  if (locale === "en") {
    return basePage;
  }

  return {
    ...basePage,
    ...TOOL_PAGE_TRANSLATIONS[locale][slug],
  };
}

export function getToolPageSummaries(locale: Locale) {
  return TOOL_PAGE_SLUGS.map((slug) => getToolPage(locale, slug));
}

export function getRelatedToolPages(locale: Locale, slugs: ToolPageSlug[]) {
  return slugs.map((slug) => getToolPage(locale, slug));
}
