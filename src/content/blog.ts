import type { Locale } from "@/i18n/routing";

export interface BlogSection {
  heading: string;
  body: string[];
}

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  eyebrow: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  keywords: string[];
  sections: BlogSection[];
  faqs: BlogFaq[];
  primaryToolPath: string;
  primaryToolLabel: string;
  secondaryToolPath: string;
  secondaryToolLabel: string;
  backLabel: string;
  faqTitle: string;
}

export interface BlogIndexCopy {
  eyebrow: string;
  title: string;
  description: string;
  readGuideLabel: string;
  metadataTitle: string;
  metadataDescription: string;
  metadataKeywords: string[];
}

interface BlogPostBase {
  slug: string;
  publishedAt: string;
  updatedAt: string;
  primaryToolPath: string;
  secondaryToolPath: string;
}

type BlogPostCopy = Omit<
  BlogPost,
  keyof BlogPostBase | "primaryToolPath" | "secondaryToolPath"
>;

const COLORIZE_GUIDE_BASE: BlogPostBase = {
  slug: "how-to-colorize-black-and-white-photos-for-free",
  publishedAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  primaryToolPath: "/colorize",
  secondaryToolPath: "/restore",
};

const BLOG_INDEX_COPY: Record<Locale, BlogIndexCopy> = {
  en: {
    eyebrow: "OldPhotoLive guides",
    title: "AI Photo Restoration Blog",
    description:
      "Practical guides for restoring old family photos, colorizing black and white portraits, repairing damaged prints, and preparing images for animation.",
    readGuideLabel: "Read guide",
    metadataTitle: "AI Photo Restoration Blog",
    metadataDescription:
      "Guides for AI photo restoration, colorizing black and white photos, repairing damaged family pictures, and animating old portraits.",
    metadataKeywords: [
      "AI photo restoration blog",
      "colorize black and white photos guide",
      "restore old family photos",
      "old photo colorizer",
    ],
  },
  zh: {
    eyebrow: "OldPhotoLive 指南",
    title: "AI 旧照片修复博客",
    description:
      "这里整理 AI 旧照片修复、黑白照片上色、破损家庭照片修补和老照片动态化的实用教程。",
    readGuideLabel: "阅读指南",
    metadataTitle: "AI 旧照片修复博客",
    metadataDescription:
      "学习如何用 AI 修复旧照片、给黑白照片上色、修补破损家庭照片，并把复古人像做成动态视频。",
    metadataKeywords: [
      "AI 旧照片修复博客",
      "黑白照片上色教程",
      "修复家庭老照片",
      "旧照片 AI 上色",
    ],
  },
  es: {
    eyebrow: "Guias de OldPhotoLive",
    title: "Blog de restauracion de fotos con IA",
    description:
      "Guias practicas para restaurar fotos familiares antiguas, colorear retratos en blanco y negro, reparar impresiones danadas y preparar imagenes para animacion.",
    readGuideLabel: "Leer guia",
    metadataTitle: "Blog de restauracion de fotos con IA",
    metadataDescription:
      "Guias para restaurar fotos antiguas con IA, colorear fotos en blanco y negro, reparar imagenes familiares danadas y animar retratos antiguos.",
    metadataKeywords: [
      "blog restauracion de fotos IA",
      "colorear fotos blanco y negro guia",
      "restaurar fotos familiares antiguas",
      "colorizador de fotos antiguas",
    ],
  },
  ja: {
    eyebrow: "OldPhotoLive ガイド",
    title: "AI 写真修復ブログ",
    description:
      "古い家族写真の修復、白黒写真のカラー化、傷んだプリントの補修、人物写真のアニメーション化に役立つ実践ガイドです。",
    readGuideLabel: "ガイドを読む",
    metadataTitle: "AI 写真修復ブログ",
    metadataDescription:
      "AI で古い写真を修復し、白黒写真をカラー化し、傷んだ家族写真を補修して、古いポートレートを動かすためのガイドです。",
    metadataKeywords: [
      "AI 写真修復 ブログ",
      "白黒写真 カラー化 ガイド",
      "古い家族写真 修復",
      "古い写真 AI カラー化",
    ],
  },
};

const BLOG_DATE_LOCALES: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
  es: "es-ES",
  ja: "ja-JP",
};

const COLORIZE_GUIDE_COPY: Record<Locale, BlogPostCopy> = {
  en: {
    title: "How to Colorize Black and White Photos for Free with AI",
    description:
      "Learn how to colorize black and white photos for free online with AI, prepare old family scans, avoid common mistakes, and restore faded photos before adding color.",
    excerpt:
      "A practical guide to turning black and white family photos into natural color online, with scan tips, AI colorizer steps, restoration advice, and free workflow options.",
    eyebrow: "AI photo colorization guide",
    readingTime: "8 min read",
    keywords: [
      "how to colorize black and white photos for free",
      "colorize black and white photos online free",
      "turn black and white photo into color online free",
      "AI photo colorizer",
      "restore old family photos",
    ],
    primaryToolLabel: "Colorize a black and white photo",
    secondaryToolLabel: "Restore an old photo first",
    backLabel: "Back to blog",
    faqTitle: "Quick answers",
    sections: [
      {
        heading: "Why colorizing old family photos works so well",
        body: [
          "Black and white family photos often feel distant to younger relatives, even when the people in the picture are parents, grandparents, or great-grandparents. Adding natural color can make the scene easier to understand: skin tones feel warmer, clothing stands out, backgrounds become recognizable, and the photo suddenly looks closer to a moment someone actually lived.",
          "The best AI photo colorizer should not simply paint the whole image with strong colors. Good colorization keeps the mood of the original photo while making faces, clothing, skies, plants, furniture, and buildings feel believable.",
        ],
      },
      {
        heading: "Step 1: Start with the cleanest scan or photo you can get",
        body: [
          "Before you colorize black and white photos online, spend a minute improving the input. If you own the original print, scan it at the highest practical resolution. If you only have a phone, place the photo near soft window light, keep the camera parallel to the print, and avoid reflections from glossy paper.",
          "Do not over-edit the photo before upload. Heavy sharpening, strong contrast filters, or compressed screenshots can remove the subtle detail that an AI colorizer needs.",
        ],
      },
      {
        heading: "Step 2: Restore faded or damaged photos before colorization",
        body: [
          "Many black and white photos are also old, faded, scratched, or creased. If you add color directly onto scratches and low-contrast areas, the final result can look noisy or uneven. A better workflow is to restore the old photo first, then colorize the cleaner image.",
          "Restoration improves contrast, recovers facial detail, reduces dust, and repairs common print damage. This gives the colorizer a stronger base for skin tones, clothing, and background color.",
        ],
      },
      {
        heading: "Step 3: Use an AI colorizer and compare the result",
        body: [
          "Once the image is ready, upload it to an AI photo colorizer. OldPhotoLive AI lets you start with a free workflow, so you can try colorization before deciding whether you need higher-resolution exports, watermark-free downloads, or more credits.",
          "After processing, compare the colorized version with the original black and white photo. Look at faces first. Natural skin tones are usually the strongest sign of a good result.",
        ],
      },
      {
        heading: "Step 4: Download, share, or continue into animation",
        body: [
          "After you turn a black and white photo into color online, download the colorized image and keep the original scan too. For genealogy pages, include both versions so relatives can compare the source photo and the restored result.",
          "If the image is a clear portrait, you can also animate the colorized photo. Subtle portrait animation works best when the face is centered and the photo has already been restored.",
        ],
      },
      {
        heading: "Common mistakes to avoid",
        body: [
          "Avoid uploading tiny screenshots from messaging apps when you have access to the original file. Avoid photographing framed prints through glass because reflections can confuse restoration and colorization.",
          "Also avoid expecting exact historical color from a single black and white photo. AI can infer likely colors, but it cannot know the exact dress fabric, wall paint, or car color unless that information is visible or provided elsewhere.",
        ],
      },
      {
        heading: "When free colorization is enough and when to upgrade",
        body: [
          "Free AI colorization is usually enough when you want to test one or two family photos, preview the style, or decide whether a scan is worth restoring.",
          "Paid plans make more sense when you are processing a full family archive, need higher-resolution downloads, want watermark-free exports, or plan to create animations from restored portraits.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I colorize black and white photos for free?",
        answer:
          "Yes. OldPhotoLive AI lets you start with a free workflow so you can test AI photo colorization before upgrading for more credits, HD exports, or watermark-free downloads.",
      },
      {
        question: "Should I restore an old photo before colorizing it?",
        answer:
          "If the photo is faded, scratched, dusty, or low contrast, restore it first. A cleaner source image usually produces more natural colors and fewer visible artifacts.",
      },
      {
        question: "Can AI know the exact original colors?",
        answer:
          "Not always. AI predicts believable colors from visual context, but it cannot guarantee exact historical colors without additional reference information.",
      },
      {
        question: "What photos work best with an AI colorizer?",
        answer:
          "Clear portraits, family snapshots, wedding photos, school photos, and moderately faded scans usually work best. Higher-resolution source images give the AI more detail.",
      },
    ],
  },
  zh: {
    title: "如何免费用 AI 给黑白照片上色",
    description:
      "学习如何在线免费给黑白照片上色：包括老照片扫描技巧、先修复再上色的流程、常见错误，以及什么时候需要高清无水印导出。",
    excerpt:
      "一篇面向家庭旧照的 AI 上色指南，讲清楚如何准备扫描件、修复破损照片、获得更自然的肤色和背景颜色。",
    eyebrow: "AI 黑白照片上色指南",
    readingTime: "约 8 分钟阅读",
    keywords: [
      "如何免费给黑白照片上色",
      "黑白照片在线上色免费",
      "AI 照片上色工具",
      "修复家庭老照片",
      "旧照片上色教程",
    ],
    primaryToolLabel: "给黑白照片上色",
    secondaryToolLabel: "先修复旧照片",
    backLabel: "返回博客",
    faqTitle: "常见问题",
    sections: [
      {
        heading: "为什么老照片上色很适合用 AI",
        body: [
          "很多黑白家庭照片其实记录的是非常亲近的人，但对年轻一代来说会显得遥远。自然的颜色能让肤色、衣服、天空、房间和背景细节更容易被理解，照片也会更像一个真实发生过的瞬间。",
          "好的 AI 上色不是把整张照片涂得很鲜艳，而是在尊重原图氛围的基础上补出可信的颜色。人物皮肤、头发、衣料、植物和室内场景都需要保持自然。",
        ],
      },
      {
        heading: "第一步：尽量准备清晰的扫描件",
        body: [
          "如果你还保留着原始纸质照片，建议用较高分辨率扫描。只有手机也可以，把照片放在柔和的自然光下，镜头尽量与照片平行，避免玻璃反光和强阴影。",
          "上传前不要过度锐化或套滤镜。很多细节会在强对比和压缩截图里丢失，而 AI 上色正需要这些细微信息来判断肤色、衣服和背景。",
        ],
      },
      {
        heading: "第二步：破损或褪色照片先修复再上色",
        body: [
          "如果照片有划痕、折痕、灰尘或严重褪色，直接上色容易把瑕疵也带进结果里。更稳妥的流程是先用 AI 修复旧照片，再给更干净的版本上色。",
          "修复会改善对比度、找回面部细节、减少污点并修补常见破损。这样上色模型才能更好地处理肤色、衣服纹理和背景颜色。",
        ],
      },
      {
        heading: "第三步：用 AI 上色后认真对比结果",
        body: [
          "上传照片后，先看人物面部是否自然。肤色通常是判断结果好坏的关键，然后再看衣服、天空、草地、木质家具和室内背景。",
          "AI 无法保证还原绝对真实的历史颜色，它会根据画面上下文预测最合理的颜色。所以目标不是考古级准确，而是生成一张尊重原始记忆、看起来可信的彩色版本。",
        ],
      },
      {
        heading: "什么时候免费版够用，什么时候值得升级",
        body: [
          "如果只是测试一两张家庭照片，免费流程通常已经够用。你可以先看上色风格是否自然，再决定要不要继续处理整本相册。",
          "如果你要批量整理家族照片、需要高清下载、无水印结果，或者还要把人像做成动态视频，那么选择合适的付费点数包会更省时间。",
        ],
      },
    ],
    faqs: [
      {
        question: "黑白照片可以免费用 AI 上色吗？",
        answer:
          "可以。OldPhotoLive AI 提供免费流程，适合先测试上色效果；如果需要更多次数、高清导出或无水印结果，再升级即可。",
      },
      {
        question: "上色前一定要先修复旧照片吗？",
        answer:
          "如果照片已经很清晰，可以直接上色；如果有划痕、灰尘、褪色或低对比度，建议先修复，结果会更自然。",
      },
      {
        question: "AI 能知道照片原本的真实颜色吗？",
        answer:
          "不能保证。AI 会根据画面内容推断可信颜色，但如果没有额外参考，无法确认衣服、墙面或物品的历史原色。",
      },
      {
        question: "什么样的照片最适合 AI 上色？",
        answer:
          "清晰的人像、家庭合影、婚礼照、毕业照和中等褪色的扫描件通常效果最好。分辨率越高，AI 可读取的细节越多。",
      },
    ],
  },
  es: {
    title: "Como colorear fotos en blanco y negro gratis con IA",
    description:
      "Aprende a colorear fotos en blanco y negro gratis online con IA, preparar escaneos familiares, evitar errores comunes y restaurar fotos descoloridas antes de anadir color.",
    excerpt:
      "Una guia practica para convertir fotos familiares en blanco y negro en imagenes con color natural, con consejos de escaneo, restauracion y exportacion.",
    eyebrow: "Guia de colorizacion con IA",
    readingTime: "8 min de lectura",
    keywords: [
      "como colorear fotos en blanco y negro gratis",
      "colorear fotos blanco y negro online gratis",
      "colorizador de fotos con IA",
      "restaurar fotos familiares antiguas",
      "convertir foto blanco y negro a color",
    ],
    primaryToolLabel: "Colorear una foto en blanco y negro",
    secondaryToolLabel: "Restaurar una foto antigua primero",
    backLabel: "Volver al blog",
    faqTitle: "Respuestas rapidas",
    sections: [
      {
        heading: "Por que la colorizacion funciona tan bien en fotos familiares",
        body: [
          "Las fotos familiares en blanco y negro pueden sentirse lejanas, incluso cuando muestran a padres o abuelos. El color natural ayuda a entender mejor la escena: la piel se ve mas cercana, la ropa destaca y el fondo gana contexto.",
          "Un buen colorizador con IA no satura toda la imagen. Mantiene el caracter de la foto original y agrega colores creibles a rostros, ropa, cielo, plantas, muebles y edificios.",
        ],
      },
      {
        heading: "Paso 1: empieza con el escaneo mas limpio posible",
        body: [
          "Si tienes la copia impresa, escaneala con una resolucion alta. Si usas el telefono, coloca la foto con luz suave, mantén la camara paralela y evita reflejos en papel brillante.",
          "No apliques filtros fuertes antes de subirla. El exceso de nitidez, contraste o compresion puede eliminar detalles que la IA necesita para decidir colores naturales.",
        ],
      },
      {
        heading: "Paso 2: restaura las fotos danadas antes de colorearlas",
        body: [
          "Si la imagen esta rayada, doblada o descolorida, colorearla directamente puede producir ruido o manchas. Lo mejor suele ser restaurar primero y colorear despues.",
          "La restauracion mejora el contraste, recupera detalles faciales y reduce polvo o grietas. Asi el colorizador tiene una base mas clara para piel, ropa y fondos.",
        ],
      },
      {
        heading: "Paso 3: compara el resultado con la foto original",
        body: [
          "Despues del procesamiento, revisa primero los rostros. Los tonos de piel naturales suelen ser la mejor senal de un buen resultado. Luego mira la ropa, el cielo, el pasto y los interiores.",
          "La IA predice colores probables, pero no puede garantizar colores historicos exactos sin referencias adicionales. El objetivo es una reconstruccion creible que respete el recuerdo original.",
        ],
      },
      {
        heading: "Cuando basta el plan gratis y cuando conviene pagar",
        body: [
          "La colorizacion gratis basta para probar una o dos fotos y decidir si el estilo funciona para tu archivo familiar.",
          "Los planes de pago tienen mas sentido si necesitas exportaciones HD, resultados sin marca de agua, mas creditos o animaciones a partir de retratos restaurados.",
        ],
      },
    ],
    faqs: [
      {
        question: "Puedo colorear fotos en blanco y negro gratis?",
        answer:
          "Si. OldPhotoLive AI ofrece un flujo gratuito para probar la colorizacion antes de pagar por mas creditos, exportaciones HD o resultados sin marca de agua.",
      },
      {
        question: "Conviene restaurar una foto antes de colorearla?",
        answer:
          "Si esta rayada, borrosa, con polvo o poco contraste, restaurarla primero suele producir colores mas naturales y menos artefactos.",
      },
      {
        question: "La IA puede saber los colores originales exactos?",
        answer:
          "No siempre. La IA predice colores creibles a partir del contexto visual, pero no puede confirmar colores historicos sin informacion adicional.",
      },
      {
        question: "Que fotos funcionan mejor con un colorizador de IA?",
        answer:
          "Retratos claros, fotos familiares, bodas, fotos escolares y escaneos moderadamente descoloridos suelen funcionar muy bien.",
      },
    ],
  },
  ja: {
    title: "AI で白黒写真を無料カラー化する方法",
    description:
      "白黒写真をオンラインで無料カラー化する流れ、古い家族写真のスキャン準備、よくある失敗、カラー化前に修復すべきケースを解説します。",
    excerpt:
      "古い白黒の家族写真を自然なカラー写真に近づけるための実践ガイドです。スキャン、AI 修復、カラー化、保存の手順をまとめました。",
    eyebrow: "AI 写真カラー化ガイド",
    readingTime: "約 8 分",
    keywords: [
      "白黒写真 無料 カラー化",
      "白黒写真 AI カラー化",
      "古い写真 カラー化 オンライン",
      "AI 写真カラー化ツール",
      "古い家族写真 修復",
    ],
    primaryToolLabel: "白黒写真をカラー化する",
    secondaryToolLabel: "先に古い写真を修復する",
    backLabel: "ブログへ戻る",
    faqTitle: "よくある質問",
    sections: [
      {
        heading: "古い家族写真と AI カラー化の相性がよい理由",
        body: [
          "白黒の家族写真は、写っている人が身近な家族でも、少し遠い時代のものに見えることがあります。自然な色が加わると、肌、服、背景、部屋の雰囲気が読み取りやすくなります。",
          "よい AI カラー化は写真全体を派手に塗ることではありません。元の写真の空気を残しながら、顔、服、空、植物、家具などに自然な色を補います。",
        ],
      },
      {
        heading: "ステップ 1: できるだけきれいな画像を用意する",
        body: [
          "紙の写真が残っている場合は、高めの解像度でスキャンします。スマートフォンで撮る場合は、柔らかい光の下で写真とカメラを平行にし、反射を避けてください。",
          "アップロード前に強いシャープ処理やコントラスト調整をかけすぎないことも大切です。AI が色を判断するための細かな情報が失われることがあります。",
        ],
      },
      {
        heading: "ステップ 2: 傷みや色あせがある写真は先に修復する",
        body: [
          "傷、折れ、ほこり、色あせがある写真をそのままカラー化すると、ノイズや不自然な色が出やすくなります。先に AI 修復を行い、きれいな画像にしてからカラー化するのがおすすめです。",
          "修復によってコントラストや顔の細部が戻り、傷や汚れも目立ちにくくなります。その結果、肌や服、背景の色も自然になりやすくなります。",
        ],
      },
      {
        heading: "ステップ 3: 結果を元の写真と見比べる",
        body: [
          "処理後は、まず顔の肌色を確認します。自然な肌色は良いカラー化の大きな目安です。次に服、空、草木、室内の背景をチェックします。",
          "AI は画面の文脈から自然そうな色を推定しますが、歴史的に正確な色を保証するものではありません。大切なのは、元の思い出を尊重した自然な再現です。",
        ],
      },
      {
        heading: "無料版で十分な場合とアップグレードすべき場合",
        body: [
          "1、2 枚の写真で雰囲気を試すだけなら、無料のワークフローで十分です。まず一番大切な写真から試して、仕上がりを確認しましょう。",
          "大量の家族アルバムを処理したい場合、HD ダウンロード、透かしなしの出力、人物写真のアニメーションが必要な場合は、有料プランが向いています。",
        ],
      },
    ],
    faqs: [
      {
        question: "白黒写真を無料でカラー化できますか？",
        answer:
          "はい。OldPhotoLive AI では無料ワークフローで AI カラー化を試せます。より多くの回数、HD 出力、透かしなしの結果が必要な場合はアップグレードできます。",
      },
      {
        question: "カラー化の前に写真修復は必要ですか？",
        answer:
          "写真がきれいなら直接カラー化できます。傷、ほこり、色あせ、低コントラストがある場合は、先に修復すると自然な結果になりやすいです。",
      },
      {
        question: "AI は元の正確な色を知っていますか？",
        answer:
          "必ずしもわかりません。AI は画像の内容から自然な色を推定しますが、追加の資料がなければ歴史的な正確さは保証できません。",
      },
      {
        question: "どんな写真が AI カラー化に向いていますか？",
        answer:
          "顔がはっきりしたポートレート、家族写真、結婚写真、学校写真、適度に色あせたスキャン画像は良い結果になりやすいです。",
      },
    ],
  },
};

function buildColorizeGuide(locale: Locale): BlogPost {
  return {
    ...COLORIZE_GUIDE_BASE,
    ...COLORIZE_GUIDE_COPY[locale],
  };
}

export function getBlogIndexCopy(locale: Locale): BlogIndexCopy {
  return BLOG_INDEX_COPY[locale];
}

export function getBlogDateLocale(locale: Locale): string {
  return BLOG_DATE_LOCALES[locale];
}

export function getBlogPosts(locale: Locale): BlogPost[] {
  return [buildColorizeGuide(locale)];
}

export function getBlogPost(locale: Locale, slug: string): BlogPost | null {
  return getBlogPosts(locale).find((post) => post.slug === slug) ?? null;
}

export function getBlogPostSlugs(): string[] {
  return [COLORIZE_GUIDE_BASE.slug];
}
