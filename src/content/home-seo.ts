import type { Locale } from "@/i18n/routing";

export interface HomeFaqItem {
  question: string;
  answer: string;
}

interface HomeSeoContent {
  contentEyebrow: string;
  contentTitle: string;
  contentParagraphs: string[];
  colorizeCta: string;
  restoreCta: string;
  faqItems: HomeFaqItem[];
}

export const HOME_SEO_CONTENT: Record<Locale, HomeSeoContent> = {
  en: {
    contentEyebrow: "AI old photo tools",
    contentTitle: "Colorize, restore, and animate old photos in one workflow",
    contentParagraphs: [
      "OldPhotoLive AI is built for family photos, genealogy projects, memorial albums, and historical images that deserve more than a quick filter. Start with a faded scan, a black-and-white portrait, or a damaged print, then choose the workflow that matches the result you want: colorize black and white photos, restore old photos online, repair visible scratches, or animate a restored portrait.",
      "The best results usually start with a clear upload. Scan the original print when possible, keep faces in focus, and avoid heavy glare from phone photos. The AI restoration pass improves contrast, cleans common damage, and prepares the image before colorization or animation, so the final photo keeps more facial detail, fabric texture, and background structure.",
      "Use the dedicated colorizer when your main goal is natural color for black-and-white family portraits. Use restoration or damage repair when the image is faded, scratched, creased, or low contrast. When a portrait is clean enough, the animation workflow can turn one still image into a short, subtle video clip for sharing with family.",
    ],
    colorizeCta: "Colorize B&W photos",
    restoreCta: "Restore old photos",
    faqItems: [
      {
        question: "Can I colorize black and white photos for free?",
        answer:
          "Yes. You can start with a free account and use your daily free quota to try AI colorization before choosing a paid plan for more credits, HD exports, and watermark-free results.",
      },
      {
        question: "What is the best way to restore old photos online?",
        answer:
          "Scan or photograph the print as clearly as possible, upload it to OldPhotoLive AI, then use the restoration workflow to repair fading, scratches, low contrast, and soft facial detail.",
      },
      {
        question: "Can faded black and white photos be restored and colorized?",
        answer:
          "Yes. The workflow can improve faded black-and-white photos first, then add natural color so portraits, clothing, and backgrounds look more believable.",
      },
      {
        question: "How long does AI photo restoration take?",
        answer:
          "Most photos are processed in a few minutes. Larger files, busy queues, or animation jobs may take longer, but your task history keeps the result available when processing completes.",
      },
      {
        question: "Can I remove scratches and creases from old photos?",
        answer:
          "Yes. The repair workflow is designed for common print damage such as scratches, dust, folds, fading, yellowing, and moderate surface wear.",
      },
      {
        question: "Are uploaded family photos private?",
        answer:
          "Your photos are processed securely and remain tied to your account history. They are not published as public examples unless you explicitly share them elsewhere.",
      },
      {
        question: "What is the difference between restoration and colorization?",
        answer:
          "Restoration repairs damage and improves clarity. Colorization adds natural color to black-and-white or faded photos. Many users restore first, then colorize the cleaner image.",
      },
      {
        question: "What do paid plans unlock?",
        answer:
          "Paid plans add more processing capacity, higher-resolution exports, HD or premium video output, and watermark-free results depending on the plan you choose.",
      },
    ],
  },
  zh: {
    contentEyebrow: "AI 旧照片工具",
    contentTitle: "在一个流程里完成旧照片上色、修复和动态化",
    contentParagraphs: [
      "OldPhotoLive AI 面向家庭老照片、家谱资料、纪念相册和历史影像。你可以上传褪色扫描件、黑白人像或破损照片，然后选择对应工具：给黑白照片上色、在线修复旧照片、修补划痕折痕，或把修复后的人像生成短视频。",
      "更好的输入通常会带来更好的结果。尽量使用清晰扫描件，保证人脸对焦，避免手机翻拍时的强反光。AI 会先改善对比度、清理常见损伤，并为后续上色或动态化准备更干净的图像。",
      "如果目标是自然色彩，优先使用上色工具；如果照片褪色、划痕、折痕或对比度很低，先使用修复或破损修补工具。当人像足够清晰后，再使用动态化流程生成适合分享给家人的短片。",
    ],
    colorizeCta: "给黑白照片上色",
    restoreCta: "修复旧照片",
    faqItems: [
      {
        question: "可以免费给黑白照片上色吗？",
        answer:
          "可以。你可以先用免费账户和每日免费额度体验 AI 上色，再根据需要升级到更多积分、高清导出和无水印结果。",
      },
      {
        question: "在线修复旧照片的最佳方式是什么？",
        answer:
          "尽量清晰扫描或翻拍原始照片，然后上传到 OldPhotoLive AI，使用修复流程改善褪色、划痕、低对比度和模糊的人脸细节。",
      },
      {
        question: "褪色黑白照片可以先修复再上色吗？",
        answer:
          "可以。流程会先改善旧照片质量，再添加更自然的颜色，让人像、衣物和背景更可信。",
      },
      {
        question: "AI 修复旧照片需要多久？",
        answer:
          "大多数照片会在几分钟内完成。大文件、排队高峰或动态化任务可能更久，完成后可在历史记录中查看结果。",
      },
      {
        question: "可以去除旧照片划痕和折痕吗？",
        answer:
          "可以。破损修补流程适合处理划痕、灰尘、折痕、褪色、发黄和中等程度的表面磨损。",
      },
      {
        question: "上传的家庭照片安全吗？",
        answer:
          "照片会安全处理并保存在你的账户历史中；除非你主动在其他地方分享，我们不会把它们作为公开案例发布。",
      },
      {
        question: "修复和上色有什么区别？",
        answer:
          "修复主要改善损伤和清晰度；上色则为黑白或褪色照片添加自然色彩。很多用户会先修复，再对更干净的图像上色。",
      },
      {
        question: "付费方案解锁什么？",
        answer:
          "付费方案会提供更多处理额度、更高分辨率导出、高清或高级视频输出，以及按方案提供的无水印结果。",
      },
    ],
  },
  es: {
    contentEyebrow: "Herramientas de fotos antiguas con IA",
    contentTitle: "Coloriza, restaura y anima fotos antiguas en un solo flujo",
    contentParagraphs: [
      "OldPhotoLive AI está pensado para fotos familiares, genealogía, álbumes conmemorativos e imágenes históricas. Sube un escaneo desvaído, un retrato en blanco y negro o una foto dañada, y elige si quieres colorizar, restaurar, reparar arañazos o animar el retrato.",
      "Los mejores resultados empiezan con una imagen clara. Escanea la copia original cuando sea posible, mantén los rostros enfocados y evita reflejos fuertes. La IA mejora el contraste, limpia daños comunes y prepara la imagen antes de la colorización o animación.",
      "Usa el colorizador cuando quieras colores naturales en retratos en blanco y negro. Usa restauración o reparación cuando la foto esté rayada, arrugada, desvaída o con poco contraste. Si el retrato ya está limpio, la animación puede convertirlo en un video corto y sutil.",
    ],
    colorizeCta: "Colorizar fotos B&N",
    restoreCta: "Restaurar fotos antiguas",
    faqItems: [
      {
        question: "¿Puedo colorizar fotos en blanco y negro gratis?",
        answer:
          "Sí. Puedes empezar con una cuenta gratuita y usar tu cuota diaria para probar la colorización antes de elegir un plan de pago.",
      },
      {
        question: "¿Cuál es la mejor forma de restaurar fotos antiguas online?",
        answer:
          "Escanea o fotografía la copia con buena claridad, súbela a OldPhotoLive AI y usa el flujo de restauración para reparar desgaste, arañazos, bajo contraste y detalles suaves.",
      },
      {
        question: "¿Se pueden restaurar y colorizar fotos antiguas desvaídas?",
        answer:
          "Sí. El flujo puede mejorar primero la foto y después añadir color natural a rostros, ropa y fondos.",
      },
      {
        question: "¿Cuánto tarda la restauración con IA?",
        answer:
          "La mayoría de las fotos se procesa en pocos minutos. Los archivos grandes, colas ocupadas o animaciones pueden tardar más.",
      },
      {
        question: "¿Puedo quitar arañazos y pliegues?",
        answer:
          "Sí. La reparación está pensada para arañazos, polvo, pliegues, decoloración, amarilleo y desgaste moderado.",
      },
      {
        question: "¿Mis fotos familiares son privadas?",
        answer:
          "Tus fotos se procesan de forma segura y quedan vinculadas a tu historial. No se publican como ejemplos públicos salvo que las compartas tú.",
      },
      {
        question: "¿Cuál es la diferencia entre restaurar y colorizar?",
        answer:
          "Restaurar repara daños y mejora la claridad. Colorizar añade color natural a fotos en blanco y negro o desvaídas.",
      },
      {
        question: "¿Qué desbloquean los planes de pago?",
        answer:
          "Los planes de pago ofrecen más capacidad, exportaciones de mayor resolución, video HD o premium y resultados sin marca de agua según el plan.",
      },
    ],
  },
  ja: {
    contentEyebrow: "AI 古写真ツール",
    contentTitle: "古い写真のカラー化、修復、アニメーションを1つの流れで",
    contentParagraphs: [
      "OldPhotoLive AI は、家族写真、系譜調査、追悼アルバム、歴史写真のためのツールです。色あせたスキャン、白黒のポートレート、傷んだプリントをアップロードし、カラー化、修復、傷や折れ目の補修、アニメーション化を選べます。",
      "良い結果には、できるだけ鮮明な元画像が重要です。可能なら原本をスキャンし、顔にピントを合わせ、スマホ撮影の強い反射を避けてください。AI はコントラストを改善し、よくある損傷を整え、カラー化やアニメーションの前に画像を準備します。",
      "自然な色を加えたい場合はカラー化ツールを、色あせや傷、折れ目、低コントラストが気になる場合は修復または補修ツールを使います。人物写真が十分に整ったら、短く自然な動画にすることもできます。",
    ],
    colorizeCta: "白黒写真をカラー化",
    restoreCta: "古い写真を修復",
    faqItems: [
      {
        question: "白黒写真を無料でカラー化できますか？",
        answer:
          "はい。無料アカウントの毎日使える枠で AI カラー化を試し、必要に応じて有料プランにアップグレードできます。",
      },
      {
        question: "古い写真をオンラインで修復する最適な方法は？",
        answer:
          "できるだけ鮮明にスキャンまたは撮影し、OldPhotoLive AI にアップロードして、色あせ、傷、低コントラスト、顔の細部を修復します。",
      },
      {
        question: "色あせた白黒写真も修復してカラー化できますか？",
        answer:
          "はい。まず写真を改善し、その後で人物、服、背景に自然な色を加えることができます。",
      },
      {
        question: "AI 写真修復にはどのくらい時間がかかりますか？",
        answer:
          "多くの写真は数分で処理されます。大きなファイル、混雑時、アニメーション処理は少し長くかかる場合があります。",
      },
      {
        question: "古い写真の傷や折れ目を消せますか？",
        answer:
          "はい。補修ツールは、傷、ほこり、折れ目、色あせ、黄ばみ、中程度の表面劣化に向いています。",
      },
      {
        question: "アップロードした家族写真は非公開ですか？",
        answer:
          "写真は安全に処理され、アカウント履歴に紐づきます。あなたが共有しない限り、公開例として掲載されることはありません。",
      },
      {
        question: "修復とカラー化の違いは？",
        answer:
          "修復は損傷を直し鮮明さを高めます。カラー化は白黒または色あせた写真に自然な色を加えます。",
      },
      {
        question: "有料プランでは何が使えますか？",
        answer:
          "有料プランでは、より多くの処理、高解像度書き出し、HD またはプレミアム動画、プランに応じた透かしなし結果が利用できます。",
      },
    ],
  },
};
