import type { Locale } from "@/i18n/routing";

interface PageSeoContent {
  title: string;
  description: string;
}

interface SeoDictionary {
  home: PageSeoContent;
  pricing: PageSeoContent;
  login: PageSeoContent;
  history: PageSeoContent;
  result: PageSeoContent;
  about: PageSeoContent;
  privacy: PageSeoContent;
  terms: PageSeoContent;
}

export const PAGE_SEO_COPY: Record<Locale, SeoDictionary> = {
  en: {
    home: {
      title: "AI Photo Restoration & Colorization",
      description:
        "Restore, colorize, and animate your old photos with AI. Upload faded family photos, repair damage, and bring memories back to life in seconds.",
    },
    pricing: {
      title: "Pricing",
      description:
        "Choose the right plan for AI photo restoration, colorization, and animation. Start free or upgrade for watermark-free exports and higher output quality.",
    },
    login: {
      title: "Sign In",
      description:
        "Sign in to OldPhotoLive AI to restore, colorize, and animate your old photos.",
    },
    history: {
      title: "History",
      description:
        "View and manage your past photo restoration tasks, download results, and retry failed jobs.",
    },
    result: {
      title: "Processing Result",
      description:
        "Review your photo restoration result, compare before and after, and download image or video outputs.",
    },
    about: {
      title: "About OldPhotoLive AI",
      description:
        "Learn who operates OldPhotoLive AI, how to contact the business, and how internal advertising operations support the service.",
    },
    privacy: {
      title: "Privacy Policy",
      description:
        "How OldPhotoLive AI collects, uses, stores, and protects your information.",
    },
    terms: {
      title: "Terms of Service",
      description: "The rules and conditions for using OldPhotoLive AI.",
    },
  },
  zh: {
    home: {
      title: "AI 旧照片修复与上色",
      description:
        "使用 AI 修复、上色和动态化旧照片。上传褪色的家庭老照片，快速修补损伤，让回忆重新鲜活起来。",
    },
    pricing: {
      title: "价格",
      description:
        "选择适合你的 AI 照片修复、上色和动态化方案。可先免费体验，也可升级到无水印与更高分辨率导出。",
    },
    login: {
      title: "登录",
      description: "登录 OldPhotoLive AI，开始修复、上色和动态化你的旧照片。",
    },
    history: {
      title: "历史记录",
      description:
        "查看和管理你过去的照片修复任务，下载结果，或重新尝试失败任务。",
    },
    result: {
      title: "处理结果",
      description:
        "查看旧照片修复结果，比较前后效果，并下载图片或视频输出。",
    },
    about: {
      title: "关于 OldPhotoLive AI",
      description:
        "了解 OldPhotoLive AI 的运营者、联系邮箱、业务地址与内部广告运营说明。",
    },
    privacy: {
      title: "隐私政策",
      description: "了解 OldPhotoLive AI 如何收集、使用、存储并保护你的信息。",
    },
    terms: {
      title: "服务条款",
      description: "使用 OldPhotoLive AI 时适用的规则与条件。",
    },
  },
  es: {
    home: {
      title: "Restauración y colorización de fotos con IA",
      description:
        "Restaura, colorea y anima tus fotos antiguas con IA. Sube fotos familiares desvaídas, repara daños y devuelve la vida a tus recuerdos en segundos.",
    },
    pricing: {
      title: "Precios",
      description:
        "Elige el plan adecuado para restauración, colorización y animación de fotos con IA. Empieza gratis o mejora para exportaciones sin marca de agua y mayor calidad.",
    },
    login: {
      title: "Iniciar sesión",
      description:
        "Inicia sesión en OldPhotoLive AI para restaurar, colorear y animar tus fotos antiguas.",
    },
    history: {
      title: "Historial",
      description:
        "Consulta y gestiona tus tareas anteriores de restauración, descarga resultados y vuelve a intentar procesos fallidos.",
    },
    result: {
      title: "Resultado del procesamiento",
      description:
        "Revisa el resultado de restauración, compara el antes y el después y descarga la imagen o el video.",
    },
    about: {
      title: "Acerca de OldPhotoLive AI",
      description:
        "Conoce quién opera OldPhotoLive AI, cómo contactar con el negocio y cómo funcionan las operaciones publicitarias internas.",
    },
    privacy: {
      title: "Política de privacidad",
      description:
        "Cómo OldPhotoLive AI recopila, usa, almacena y protege tu información.",
    },
    terms: {
      title: "Términos del servicio",
      description: "Las reglas y condiciones para usar OldPhotoLive AI.",
    },
  },
  ja: {
    home: {
      title: "AI 写真修復とカラー化",
      description:
        "AI で古い写真を修復、カラー化、アニメーション化します。色あせた家族写真をアップロードして、傷みを修復し、思い出をよみがえらせましょう。",
    },
    pricing: {
      title: "料金",
      description:
        "AI 写真修復、カラー化、アニメーションに最適なプランを選べます。無料で始めることも、透かしなし高品質出力にアップグレードすることもできます。",
    },
    login: {
      title: "ログイン",
      description:
        "OldPhotoLive AI にログインして、古い写真の修復、カラー化、アニメーション化を始めましょう。",
    },
    history: {
      title: "履歴",
      description:
        "過去の写真修復タスクを確認し、結果のダウンロードや失敗した処理の再実行ができます。",
    },
    result: {
      title: "処理結果",
      description:
        "写真修復の結果を確認し、ビフォーアフターを比較して、画像や動画をダウンロードできます。",
    },
    about: {
      title: "OldPhotoLive AI について",
      description:
        "OldPhotoLive AI の運営者、連絡先、内部広告運用の概要を案内します。",
    },
    privacy: {
      title: "プライバシーポリシー",
      description:
        "OldPhotoLive AI が情報をどのように収集、利用、保存、保護するかを説明します。",
    },
    terms: {
      title: "利用規約",
      description: "OldPhotoLive AI を利用する際のルールと条件です。",
    },
  },
};
