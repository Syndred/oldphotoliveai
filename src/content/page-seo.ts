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
      title: "Colorize Photo Online – AI Photo Colorizer",
      description:
        "Colorize a photo online with AI. Upload your photo, sign in, and pay $1.99 before processing with your selected tool. The complete paid-quality result has no watermark. No subscription is required.",
    },
    pricing: {
      title: "Pricing",
      description:
        "Upload your photo, sign in, and pay $1.99 before processing with your selected tool. The complete paid-quality result has no watermark. No subscription is required.",
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
      title: "老照片修复与上色",
      description:
        "上传照片并登录后，先支付 $1.99 再开始所选功能的处理，交付完整无水印结果，无需订阅。已有积分或专业版权益仍可使用。",
    },
    pricing: {
      title: "价格",
      description:
        "上传照片并登录后，先支付 $1.99 再开始所选功能的处理，交付完整无水印结果，无需订阅。已有积分或专业版权益仍可使用。",
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
      title: "Restaura y coloriza fotos",
      description:
        "Sube una foto, inicia sesión y paga $1.99 antes de procesarla con la herramienta seleccionada. Resultado completo sin marca de agua ni suscripción. También puedes usar tus créditos o plan profesional.",
    },
    pricing: {
      title: "Precios",
      description:
        "Sube una foto, inicia sesión y paga $1.99 antes de procesarla con la herramienta seleccionada. Resultado completo sin marca de agua ni suscripción. También puedes usar tus créditos o plan profesional.",
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
      title: "古い写真の修復とカラー化",
      description:
        "写真をアップロードしてログイン後、選択した機能の処理前に$1.99を支払います。透かしなしの完全な結果で、定期購入は不要です。既存のクレジットやプロプランも利用できます。",
    },
    pricing: {
      title: "料金",
      description:
        "写真をアップロードしてログイン後、選択した機能の処理前に$1.99を支払います。透かしなしの完全な結果で、定期購入は不要です。既存のクレジットやプロプランも利用できます。",
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
