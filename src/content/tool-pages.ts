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
    eyebrow: "Popular tools",
    title: "Pick the tool you need",
    description:
      "Restore, repair, colorize, or animate old family photos in one place.",
    exploreWorkflowLabel: "Open tool",
    seePricingLabel: "See pricing",
    comparePlansLabel: "Compare plans",
    homeLabel: "Home",
  },
  zh: {
    eyebrow: "热门工具",
    title: "选择你现在要用的工具",
    description:
      "在一个站内完成老照片修复、补损、上色和动态化。",
    exploreWorkflowLabel: "打开工具",
    seePricingLabel: "查看价格",
    comparePlansLabel: "比较方案",
    homeLabel: "首页",
  },
  es: {
    eyebrow: "Herramientas",
    title: "Elige la herramienta que necesitas",
    description:
      "Restaura, repara, coloriza o anima fotos familiares antiguas desde un solo sitio.",
    exploreWorkflowLabel: "Abrir herramienta",
    seePricingLabel: "Ver precios",
    comparePlansLabel: "Comparar planes",
    homeLabel: "Inicio",
  },
  ja: {
    eyebrow: "人気ツール",
    title: "今使いたいツールを選べる",
    description:
      "古い家族写真の修復、補修、カラー化、アニメーションを1つのサイトで行えます。",
    exploreWorkflowLabel: "ツールを開く",
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
      "Export a cleaner image that is ready for saving or sharing",
    ],
    primaryCtaLabel: "Restore a photo now",
    uploadTitle: "Upload a photo to restore",
    uploadSubtitle:
      "Upload a scan or family print to clean damage, recover details, and create a stronger master image in minutes.",
    introTitle: "Bring faded memories back",
    introBody:
      "Old family photos often lose contrast, collect scratches, and blur in the areas people care about most. This workflow gives you a fast, natural first pass so portraits, wedding prints, and album scans look usable again.",
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
          "When you have many old photos to sort through, a quick restoration pass helps you decide which images are ready to save, print, or refine further.",
      },
    ],
    pricingTitle: "Choose the plan that fits your archive",
    pricingBody:
      "Buy credits for occasional repairs or choose Professional if you are restoring albums, family archives, or client work at a higher volume.",
    faqTitle: "Questions about restoring old photos",
    faqs: [
      {
        question: "Can I restore a photo without Photoshop?",
        answer:
          "Yes. This workflow is designed to give you a fast AI-assisted restoration pass before you decide whether any manual retouching is still needed.",
      },
      {
        question: "What kinds of photos work best?",
        answer:
          "Portraits, family snapshots, wedding prints, and moderately damaged scans usually benefit most. A cleaner scan gives the model more detail to work with.",
      },
      {
        question: "Can I colorize or animate the restored image afterward?",
        answer:
          "Yes. Once the image has been cleaned up, you can continue with colorization or animation from the same account.",
      },
      {
        question: "How do I choose between credits and Professional?",
        answer:
          "Credits work well for occasional jobs, while Professional is better if you restore photos frequently or need higher monthly volume.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "After restoration, you can keep improving the same photo with damage repair, colorization, or animation tools.",
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
      "Colorize old photos with AI. Turn black-and-white family pictures into natural-looking color with cleaner detail and balanced tones.",
    keywords: [
      "colorize old photos",
      "old photo colorizer",
      "black and white photo colorizer",
      "ai photo colorization",
    ],
    cardTitle: "Colorize old photos",
    cardDescription:
      "Turn black-and-white memories into natural color with cleaner faces, clothing, and background detail.",
    eyebrow: "AI colorization",
    heroTitle: "Colorize black-and-white family photos in the same workflow",
    heroDescription:
      "Upload a black-and-white portrait or family snapshot to add realistic color while preserving facial detail, clothing texture, and scene balance.",
    heroHighlights: [
      "Bring black-and-white portraits into natural color",
      "Start from a restored base instead of coloring damage",
      "Keep skin tones, fabric, and background colors believable",
    ],
    primaryCtaLabel: "Colorize a photo now",
    uploadTitle: "Upload a photo to colorize",
    uploadSubtitle:
      "Start with a scan or black-and-white print and generate a cleaner, naturally colored result in one pass.",
    introTitle: "Add color without losing the original feeling",
    introBody:
      "Old family photos need more than a simple tint overlay. This workflow first improves the source image, then adds color that feels closer to a real print instead of a noisy filter.",
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
        title: "Make old memories easier to share",
        body:
          "Colorized photos are easier to share with younger family members, include in memorial projects, and print for albums or gifts.",
      },
    ],
    pricingTitle: "Pick a plan for one photo or a full batch",
    pricingBody:
      "Use a credit pack for occasional color work, or choose Professional if you are processing albums, family archives, or client orders.",
    faqTitle: "Questions about colorizing old photos",
    faqs: [
      {
        question: "Do I need a separate plan just for colorization?",
        answer:
          "No. Any paid plan on your account can be used for colorization.",
      },
      {
        question: "Will the workflow repair the photo before adding color?",
        answer:
          "Yes. The pipeline still restores the image first so the final color result has cleaner structure and fewer visible defects.",
      },
      {
        question: "Can I still download the final image and animation result?",
        answer:
          "Yes. You can download the final image after colorization, and you can continue into animation if you want a moving result.",
      },
      {
        question: "What kind of source photos work well here?",
        answer:
          "Black-and-white portraits, family snapshots, and moderately faded prints usually perform best. A better scan usually leads to better color decisions.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "If the photo also needs cleanup or motion, continue with restoration, damage repair, or animation tools.",
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
      "Animate old photos with AI. Turn restored portraits into short video clips with subtle, natural motion.",
    keywords: [
      "animate old photos",
      "old photo animation",
      "bring old photos to life",
      "animate family photos",
    ],
    cardTitle: "Animate old photos",
    cardDescription:
      "Turn a restored portrait into a short moving clip with subtle facial motion and a cleaner frame.",
    eyebrow: "AI animation",
    heroTitle: "Animate old photos after they have been cleaned and restored",
    heroDescription:
      "Upload a portrait and generate a short moving clip after the photo has been cleaned up and prepared for animation.",
    heroHighlights: [
      "Create short portrait animations from one upload",
      "Use a repaired and colorized frame as the animation base",
      "Create gentle motion that still feels right for family memories",
    ],
    primaryCtaLabel: "Animate a photo now",
    uploadTitle: "Upload a photo to animate",
    uploadSubtitle:
      "Portraits with clear faces and centered subjects usually create the most natural animation results.",
    introTitle: "Turn a still portrait into a living memory",
    introBody:
      "Animation works best when the source photo is clean, the subject is visible, and the final motion stays subtle. Short clips usually feel strongest when they stay emotional and restrained instead of exaggerated.",
    showcaseTitle: "Animated old photo examples",
    showcaseSubtitle:
      "Short motion examples based on restored family portraits and old photographs.",
    showcaseKind: "animation",
    benefitsTitle: "What this workflow is best at",
    benefits: [
      {
        title: "Create something you can immediately share",
        body:
          "Short animated clips work well for tribute videos, family group chats, and social posts that bring old portraits back into conversation.",
      },
      {
        title: "Start from a repaired portrait",
        body:
          "Cleaner source images usually produce more believable motion around the eyes, mouth, and head position.",
      },
      {
        title: "Keep the motion subtle and believable",
        body:
          "Gentle movement is usually more convincing for old family portraits than exaggerated effects or fast camera motion.",
      },
    ],
    pricingTitle: "Choose credits or Professional access",
    pricingBody:
      "Use credits for occasional animation projects, or upgrade if you regularly create short clips from family archives or client work.",
    faqTitle: "Questions about animating old photos",
    faqs: [
      {
        question: "Does the photo need to be repaired before animation?",
        answer:
          "The best results come from a clean source image. This workflow prepares the photo before generating motion so the final clip looks more stable.",
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
        question: "Can I use my paid access for animation too?",
        answer:
          "Yes. Once you purchase a paid plan, you can use it for animation as well.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "If the photo needs cleanup or color before animation, explore the restoration, damage repair, and colorization tools.",
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
      "Repair damaged old photos with AI. Clean scratches, dust, faded contrast, and worn paper to recover damaged family prints.",
    keywords: [
      "repair damaged old photos",
      "fix faded old photos",
      "repair scratched photos",
      "repair damaged family photos",
    ],
    cardTitle: "Repair damaged old photos",
    cardDescription:
      "Remove scratches, dust, folds, and yellowing from worn prints and old scans.",
    eyebrow: "Damage repair",
    heroTitle: "Repair scratches, fading, and damage in old family photos",
    heroDescription:
      "Use AI to repair visible damage in old prints, including surface scratches, dust, folds, fading, and yellowed paper.",
    heroHighlights: [
      "Fix scratches, dust marks, folds, and washed-out contrast",
      "Recover facial clarity and fabric detail from worn prints",
      "Prepare damaged photos for saving, sharing, or further restoration",
    ],
    primaryCtaLabel: "Repair a damaged photo",
    uploadTitle: "Upload a damaged photo",
    uploadSubtitle:
      "Start with a damaged scan or a phone photo of a print and get a cleaner restoration pass in minutes.",
    introTitle: "Repair the damage before it gets worse",
    introBody:
      "Old prints often suffer from scratches, dust, creases, fading, and paper wear. This workflow focuses on cleaning the damage first so the photo is easier to preserve, share, or restore further.",
    showcaseTitle: "Damage repair examples",
    showcaseSubtitle:
      "Examples focused on faded contrast, visible surface defects, and common family-photo wear.",
    showcaseKind: "restoration",
    benefitsTitle: "What this workflow is best at",
    benefits: [
      {
        title: "Handle the most common print damage",
        body:
          "Use it for faded contrast, surface scratches, dust spots, fold marks, and everyday wear found in albums, drawers, and framed prints.",
      },
      {
        title: "Repair before you decide on manual work",
        body:
          "Use AI to take the first pass on repetitive damage so you only hand-edit the special cases that truly need it.",
      },
      {
        title: "Prepare the photo for the next step",
        body:
          "Once the visible damage is reduced, the image is easier to colorize, animate, print, or fine-tune with manual retouching.",
      },
    ],
    pricingTitle: "Choose a plan for a few repairs or a full archive",
    pricingBody:
      "Buy credits for a handful of damaged prints, or choose Professional if you are restoring albums, family archives, or client collections.",
    faqTitle: "Questions about repairing damaged old photos",
    faqs: [
      {
        question: "Is this good for scratched and yellowed prints?",
        answer:
          "Yes. It is built for common print problems such as scratches, fading, yellowing, dust, and moderate surface wear.",
      },
      {
        question: "What types of damage are usually fixable?",
        answer:
          "Fading, low contrast, dust, scratches, and moderate surface wear are the most common cases. Very severe loss of detail may still need manual retouching after the AI pass.",
      },
      {
        question: "Will the same workflow also colorize and animate the photo?",
        answer:
          "Yes. After the visible damage has been cleaned up, you can continue into colorization or animation.",
      },
      {
        question: "Do I need to buy a special damage-repair package?",
        answer:
          "No. Pick the paid plan that matches how many photos you want to repair.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "After damage repair, keep improving the photo with restoration, colorization, or animation tools.",
    relatedSlugs: [
      "restore-old-photos",
      "colorize-old-photos",
      "animate-old-photos",
    ],
  },
};

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
