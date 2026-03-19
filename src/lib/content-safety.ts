const CONTENT_SAFETY_COPY = {
  en: {
    termsTitle: "4A. Content Safety and Moderation",
    termsBody:
      "You may not use OldPhotoLive AI to upload, generate, restore, animate, edit, transform, or distribute NSFW, nude, sexually explicit, pornographic, fetish, or exploitative content. Content involving minors, non-consensual intimate imagery, or sexual exploitation is strictly prohibited. We may block processing, remove content, suspend accounts, and report material when required by law or platform rules.",
    uploadTitle: "Content Safety",
    uploadNotice:
      "Only upload lawful images you have the right to use. NSFW, nude, sexually explicit, pornographic, or exploitative content is prohibited and may be blocked or removed.",
    linkLabel: "Read our Terms of Service",
  },
  zh: {
    termsTitle: "4A. 内容安全与审核",
    termsBody:
      "你不得使用 OldPhotoLive AI 上传、生成、修复、动画化、编辑、转换或分发任何 NSFW、裸露、露骨性内容、色情、恋物或剥削性内容。涉及未成年人、未经同意的私密影像，或任何性剥削内容均被严格禁止。我们可能会拦截处理、移除内容、暂停账户，并在法律或平台规则要求时进行举报。",
    uploadTitle: "内容安全",
    uploadNotice:
      "只可上传你有权使用的合法图片。NSFW、裸露、露骨性内容、色情或剥削性内容均被禁止，相关内容可能会被拦截或移除。",
    linkLabel: "查看服务条款",
  },
  ja: {
    termsTitle: "4A. コンテンツ安全性と審査",
    termsBody:
      "OldPhotoLive AI を使用して、NSFW、ヌード、性的に露骨なコンテンツ、ポルノ、フェティッシュ、または搾取的なコンテンツをアップロード、生成、修復、アニメーション化、編集、変換、配布することはできません。未成年者を含む内容、同意のない私的な画像、または性的搾取に関わるコンテンツは厳しく禁止されます。法令またはプラットフォーム規則で求められる場合、当社は処理の拒否、コンテンツの削除、アカウント停止、必要な報告を行うことがあります。",
    uploadTitle: "コンテンツ安全性",
    uploadNotice:
      "合法で、かつ利用権限を持つ画像のみをアップロードしてください。NSFW、ヌード、性的に露骨なコンテンツ、ポルノ、または搾取的なコンテンツは禁止されており、ブロックまたは削除される場合があります。",
    linkLabel: "利用規約を見る",
  },
  es: {
    termsTitle: "4A. Seguridad del contenido y moderación",
    termsBody:
      "No puedes usar OldPhotoLive AI para subir, generar, restaurar, animar, editar, transformar ni distribuir contenido NSFW, desnudos, contenido sexualmente explícito, pornográfico, fetichista o explotador. El contenido que involucre menores, imágenes íntimas sin consentimiento o explotación sexual está estrictamente prohibido. Podemos bloquear el procesamiento, retirar contenido, suspender cuentas y reportar material cuando lo exijan la ley o las reglas de la plataforma.",
    uploadTitle: "Seguridad del contenido",
    uploadNotice:
      "Solo sube imágenes legales que tengas derecho a usar. El contenido NSFW, desnudos, sexualmente explícito, pornográfico o explotador está prohibido y puede ser bloqueado o retirado.",
    linkLabel: "Leer los Términos del servicio",
  },
} as const;

type ContentSafetyLocale = keyof typeof CONTENT_SAFETY_COPY;

export function getContentSafetyCopy(locale: string) {
  return (
    CONTENT_SAFETY_COPY[locale as ContentSafetyLocale] ??
    CONTENT_SAFETY_COPY.en
  );
}
