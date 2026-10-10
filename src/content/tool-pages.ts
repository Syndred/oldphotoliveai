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

const TOOL_PAGE_PATHS: Record<ToolPageSlug, string> = {
  "restore-old-photos": "/restore-old-photos",
  "colorize-old-photos": "/colorize-old-photos",
  "animate-old-photos": "/animate",
  "repair-damaged-old-photos": "/repair-damaged-old-photos",
};

export type ToolShowcaseKind = "restoration" | "colorization" | "animation";

export interface ToolBenefit {
  title: string;
  body: string;
}

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolGuideSection {
  title: string;
  body: string;
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
  guideSections?: ToolGuideSection[];
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
    title: "Restore Old Photos Online – AI Photo Restoration",
    description:
      "Restore old damaged photos online with AI. Upload your photo, sign in, and pay $1.99 before processing with your selected tool. The complete paid-quality result has no watermark. No subscription is required.",
    keywords: [
      "restore old photos",
      "old photo restoration",
      "ai photo restoration",
      "fix old photos",
      "repair old photos",
    ],
    cardTitle: "Restore old photos",
    cardDescription:
      "Repair faded family prints, recover details, and produce a cleaner master image before color and animation.",
    eyebrow: "AI restoration",
    heroTitle: "Restore Old Photos with AI",
    heroDescription:
      "Upload one damaged family photo and let AI restore detail, improve contrast, remove visible wear, and prepare the image for colorization or animation.",
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
      "Old family photos often lose contrast, collect scratches, and blur in the areas people care about most. This AI photo restoration workflow gives you a fast, natural first pass for portraits, wedding prints, genealogy records, memorial albums, and scanned family archives. Start with the clearest scan you have, restore old photos online, then decide whether to download the restored image, colorize it, or animate the portrait.",
    showcaseTitle: "Before & After: Restore Old Photos",
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
        title: "Choose the exact job you need",
        body:
          "Use restoration by itself when you only need a cleaner image, then move to colorization or animation later if the photo calls for it.",
      },
      {
        title: "Give old family archives a faster first pass",
        body:
          "When you have many old photos to sort through, a quick restoration pass helps you decide which images are ready to save, print, or refine further.",
      },
    ],
    guideSections: [
      {
        title: "What AI photo restoration can repair",
        body:
          "Old photo restoration works best on the common problems found in family albums: faded contrast, soft facial detail, small scratches, dust, and paper wear. This form of photo restoration can make portraits easier to recognize, recover clothing and background texture, and create a cleaner image for printing or sharing. Severe missing areas may still need manual retouching, but an AI first pass usually saves time and gives you a stronger version to work from.",
      },
      {
        title: "Use cases for family archives and genealogy",
        body:
          "People often restore photos for memorial videos, genealogy profiles, anniversary gifts, family trees, local history collections, and scanned albums. A restored image is easier to identify, tag, and preserve. If the photo is a portrait, you can also use the restored version as the base for natural colorization or a short animation clip.",
      },
      {
        title: "Tips for better restoration results",
        body:
          "Use the highest-resolution scan you can, crop away empty borders only after scanning, and avoid photographing glossy prints under direct light. If a photo is extremely dark, try a scan that preserves as much detail as possible instead of over-brightening it before upload. The more real detail the AI can see, the better it can restore old photos online.",
      },
    ],
    pricingTitle: "Restore one photo at a time",
    pricingBody:
      "Pay $1.99 for one uploaded photo and the selected restoration workflow. The completed result includes downloads without a watermark. No subscription is required.",
    faqTitle: "Questions about restoring old photos",
    faqs: [
      {
        question: "What is the best way to restore old photos online?",
        answer:
          "Scan or photograph the original print as clearly as possible, then upload it to OldPhotoLive AI. The restoration tool repairs fading, scratches, low contrast, and soft facial detail before you download the cleaner image.",
      },
      {
        question: "Can faded black and white photos be restored?",
        answer:
          "Yes. Faded black-and-white photos can often be improved by restoring contrast, sharpening important details, and cleaning visible surface damage before optional colorization.",
      },
      {
        question: "Can I remove scratches and creases from old photos?",
        answer:
          "Yes. The repair workflow can reduce common print damage such as scratches, creases, dust spots, fading, yellowing, and moderate paper wear.",
      },
      {
        question: "How long does it take to restore an old photo?",
        answer:
          "Most photos are processed in a few minutes. Larger files, higher-resolution outputs, or animation jobs may take longer when the queue is busy.",
      },
      {
        question: "Can I colorize or animate the restored image afterward?",
        answer:
          "Yes. Once the image has been cleaned up, you can continue with AI colorization or animation from the same account.",
      },
      {
        question: "Do I need Photoshop to restore old photos?",
        answer:
          "No. OldPhotoLive AI is designed to give you an AI-assisted restoration pass online before you decide whether any manual retouching is still needed.",
      },
    ],
    relatedTitle: "More old-photo workflows",
    relatedDescription:
      "After restoration, you can keep improving the same photo with colorization or animation tools.",
    relatedSlugs: [
      "colorize-old-photos",
      "animate-old-photos",
    ],
  },
  "colorize-old-photos": {
  "slug": "colorize-old-photos",
  "title": "Photo Colorization with AI – Colorize Black and White Photos Online",
  "description": "Turn black-and-white photos into natural-looking color with AI. Keep a watermark-free result with images up to 2K — $1.99 per photo, no subscription.",
  "keywords": [
    "photo colorization",
    "colorize black and white photos",
    "AI photo colorizer",
    "colorize old photos",
    "old photo colorizer"
  ],
  "cardTitle": "Colorize old photos",
  "cardDescription": "Add AI-estimated color to black-and-white family photographs and compare the result with your original.",
  "eyebrow": "AI colorization",
  "heroTitle": "Photo Colorization with AI",
  "heroDescription": "Turn black-and-white photos into natural-looking color with AI. Upload a clear scan to restore, colorize, and download the finished photo without a watermark.",
  "heroHighlights": [
    "Restore the image before adding estimated color",
    "Compare faces, clothing, and fine details with the original",
    "Download the finished image without a watermark"
  ],
  "primaryCtaLabel": "Colorize a photo now",
  "uploadTitle": "Upload a photo to colorize",
  "uploadSubtitle": "Upload a clear scan or black-and-white photo to prepare your single-photo order.",
  "introTitle": "How an AI photo colorizer estimates colors",
  "introBody": "An AI photo colorizer uses patterns learned from color images to estimate colors for shapes and textures in a black-and-white photo. Faces, clothing, plants, and skies provide visual clues, but several different colors can produce the same gray tone. This workflow first restores the image, then adds predicted color. The result is an interpretation, not evidence of the original historical colors; compare it with reliable references if accuracy matters.",
  "showcaseTitle": "Before & After Examples",
  "showcaseSubtitle": "Compare an original black-and-white photo with an AI-colorized result. The example demonstrates the workflow, not a guaranteed result for every photograph.",
  "showcaseKind": "colorization",
  "benefitsTitle": "How to Colorize Black and White Photos",
  "benefits": [
    {
      "title": "1. Prepare a clear source",
      "body": "Scan the print or photograph it in even light. Include the whole image and avoid glare, strong filters, or heavy compression. You can upload before signing in."
    },
    {
      "title": "2. Choose colorization",
      "body": "The workflow restores the image and estimates color. Processing usually takes a few minutes, with longer waits possible when demand is high."
    },
    {
      "title": "3. Compare and save",
      "body": "Review faces, clothing, and fine details against the original. Save the complete colorized result without a watermark, while keeping the source as your reference."
    }
  ],
  "guideSections": [
    {
      "title": "Prepare a clearer scan before you colorize old photos",
      "body": "Scan the print when possible, or photograph it in even light with the camera parallel to the paper. Avoid shadows, reflections, and beauty filters. Small faces in group photos and heavily damaged areas give the model less information, so inspect those parts of the output carefully."
    },
    {
      "title": "Keep the original alongside your colorized copy",
      "body": "A colorized photograph can offer a new way to view a family memory, but it should not replace the source in an archive. Label shared copies as AI-colorized, especially in genealogy records or historical projects. Use dated reference photographs or family knowledge to judge whether suggested colors are plausible."
    }
  ],
  "pricingTitle": "One photo, one payment",
  "pricingBody": "Colorization costs $1.99 for one uploaded photo and the selected workflow. Sign in with Google and pay before processing; the complete result includes watermark-free downloads. No subscription is required.",
  "faqTitle": "Questions about AI photo colorization",
  "faqs": [
    {
      "question": "How do I colorize a black-and-white photo?",
      "answer": "Upload a clear JPEG, PNG, or WebP image, choose colorization, and sign in to access your order. The tool restores the image before estimating color. When processing finishes, compare and download the result from its result page."
    },
    {
      "question": "Is colorization suitable for family photos?",
      "answer": "Clear portraits, wedding prints, and family groups can be useful sources. Check each face and garment after processing, especially small faces in group photographs. Ask relatives about known clothing or setting colors rather than treating AI guesses as facts."
    },
    {
      "question": "How should I use colorization in an archive or genealogy project?",
      "answer": "Preserve the unedited scan as the master file and save the colorized version separately. Label it as AI-colorized, and keep the source date, people, location, and any known color references with the record."
    },
    {
      "question": "Can I use it for historical photographs?",
      "answer": "Use the result as an illustration, not evidence of historical color. Uniforms, flags, interiors, and skin tones may be estimated incorrectly. Compare those details with dated color photographs, museum records, or other reliable references before publication."
    },
    {
      "question": "Will AI recover the real historical colors?",
      "answer": "No. A grayscale image does not uniquely identify the original colors. The model predicts plausible shades and may also change fine details; a natural-looking result does not establish historical accuracy."
    },
    {
      "question": "Can I download and print the colorized result?",
      "answer": "The completed result includes a download without a watermark. Images fit within 2048 × 2048 pixels, preserve their aspect ratio, and may be smaller depending on the generated source. Check dimensions and detail before choosing a print size."
    },
    {
      "question": "Does colorization also repair damage?",
      "answer": "The workflow includes restoration before colorization and can improve fading and common surface defects. Severe tears, missing faces, unreadable lettering, or very small details may require manual restoration."
    },
    {
      "question": "What if processing fails?",
      "answer": "A confirmed technical failure can be retried once at no extra cost. If delivery is confirmed impossible, the order is refunded. Content-policy rejections are not refunded; uncertain provider or payment states need review before another attempt. Refund arrival depends on the payment provider and bank."
    }
  ],
  "relatedTitle": "More old-photo workflows",
  "relatedDescription": "For a different result, explore restoration or portrait animation.",
  "relatedSlugs": [
    "restore-old-photos",
    "animate-old-photos"
  ]
},
  "animate-old-photos": {
    slug: "animate-old-photos",
    title: "Animate Old Photos with AI",
    description:
      "Animate old photos with AI. Turn restored portraits into short video clips with subtle, natural motion.",
    keywords: [
      "animate old photos",
      "old photo animation",
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
    guideSections: [
      {
        title: "When old photo animation works best",
        body:
          "Animation works best on portraits with a clear face, good framing, and a restored source image. Subtle movement around the eyes, mouth, and head usually feels more respectful and believable than dramatic effects. For old family photos, the strongest result is often a short clip that feels like a living portrait rather than a flashy video effect.",
      },
      {
        title: "Prepare the image before generating motion",
        body:
          "A clean image gives the animation model fewer defects to track. Restore scratches, improve contrast, and colorize the portrait first when needed. This helps the final clip keep the subject stable, reduces distracting artifacts, and makes the movement easier to share in memorial slideshows, family chats, and social posts.",
      },
      {
        title: "Good animation inputs and realistic expectations",
        body:
          "Centered portraits generally animate better than full-body photos, crowded scenes, or images with hidden faces. Very blurry eyes, missing facial regions, or strong glare can limit the quality of motion. If the first result is not ideal, try a cleaner crop or restore the photo again before creating the animation.",
      },
    ],
    pricingTitle: "One photo, one payment",
    pricingBody:
      "Pay $1.99 for one photo and the selected animation workflow. The completed result includes downloads, with no subscription required.",
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
          "Yes. The animation entry repairs and improves the image before generating motion, which usually produces a stronger final clip.",
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
      "If the photo needs cleanup or color before animation, explore the restoration and colorization tools.",
    relatedSlugs: [
      "restore-old-photos",
      "colorize-old-photos",
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
    showcaseTitle: "Before & After: Repair Damaged Old Photos",
    showcaseSubtitle:
      "Examples focused on faded contrast, visible surface defects, and common family-photo wear.",
    showcaseKind: "restoration",
    benefitsTitle: "Types of Damage We Repair",
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
    guideSections: [
      {
        title: "Repair common old-photo damage before restoration",
        body:
          "Many old prints show the same problems: scratches, dust, fold marks, yellowing, water stains, and faded contrast. Damage repair focuses on reducing those visible defects so the important parts of the image are easier to see. It is a practical first step before you create a final restored image, colorize the photo, or animate a portrait.",
      },
      {
        title: "What damage repair can and cannot do",
        body:
          "AI can often reduce surface wear and improve damaged areas that still contain visual context. It cannot perfectly recreate information that is completely missing from a destroyed section of the print. For severe damage, use the AI result as a cleaner draft, then decide whether manual retouching is worth the extra effort.",
      },
      {
        title: "How to scan damaged photos for better repair",
        body:
          "Scan at a high resolution when possible, keep the print flat, and avoid reflections across glossy paper. If you only have a phone camera, place the photo near soft window light and shoot straight down. A stable, evenly lit input gives the repair model a better chance to remove scratches and creases naturally.",
      },
    ],
    pricingTitle: "Repair one photo at a time",
    pricingBody:
      "Pay $1.99 for one uploaded photo and the selected repair workflow. Review the complete result and download it without a watermark. No subscription is required.",
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
        question: "Can I colorize or animate the repaired photo afterward?",
        answer:
          "Yes. This repair page focuses on cleanup first; after that, you can use the colorization or animation tools if you want another result.",
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
  return TOOL_PAGE_SLUGS.filter(
    (slug) => slug !== "repair-damaged-old-photos"
  ).map((slug) => getToolPage(locale, slug));
}

export function getRelatedToolPages(locale: Locale, slugs: ToolPageSlug[]) {
  return slugs.map((slug) => getToolPage(locale, slug));
}

export function getToolPagePath(slug: ToolPageSlug): string {
  return TOOL_PAGE_PATHS[slug];
}
