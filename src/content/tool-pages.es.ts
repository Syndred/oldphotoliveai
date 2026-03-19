import type {
  LocalizedToolPageDocument,
  ToolPageSlug,
} from "./tool-pages";

export const TOOL_PAGE_TRANSLATIONS_ES: Record<
  ToolPageSlug,
  LocalizedToolPageDocument
> = {
  "restore-old-photos": {
    title: "Restaura fotos antiguas online con IA",
    description:
      "Restaura fotos antiguas online con IA. Repara copias descoloridas, recupera detalles faciales y limpia arañazos con una sola subida.",
    keywords: [
      "restaurar fotos antiguas",
      "restaurar fotos antiguas online",
      "restauración de fotos antiguas",
      "IA para restaurar fotos",
    ],
    cardTitle: "Restaurar fotos antiguas",
    cardDescription:
      "Repara fotos familiares descoloridas, recupera detalle y consigue una base más limpia antes de colorizar o animar.",
    eyebrow: "Restauración con IA",
    heroTitle: "Restaura fotos antiguas sin reconstruir la imagen a mano",
    heroDescription:
      "Sube una foto familiar dañada y deja que el mismo flujo recupere detalle, mejore el contraste y prepare la imagen para color y animación.",
    heroHighlights: [
      "Repara copias descoloridas y escaneos con poco contraste",
      "Recupera rostros, texturas de ropa y detalle del fondo",
      "Usa el mismo sistema de créditos en todos los flujos",
    ],
    primaryCtaLabel: "Restaurar una foto ahora",
    uploadTitle: "Sube una foto para restaurar",
    uploadSubtitle:
      "Empieza con una sola subida y continúa con restauración, colorización y animación dentro del mismo flujo.",
    introTitle: "Por qué existe esta página",
    introBody:
      "Quien busca restauración de fotos antiguas suele querer el camino más rápido desde un escaneo dañado hasta un resultado útil. Esta página deja clara la promesa: sube la foto, deja que la IA la repare y sigue en el mismo producto si además quieres color o movimiento.",
    showcaseTitle: "Ejemplos de restauración de fotos antiguas",
    showcaseSubtitle:
      "Ejemplos reales de antes y después centrados en recuperar contraste, limpiar arañazos y reparar detalle facial.",
    benefitsTitle: "Para qué funciona mejor este flujo",
    benefits: [
      {
        title: "Corrige primero el daño más evidente",
        body:
          "Usa IA para tratar desvanecimiento, contraste lavado, pequeños arañazos y detalle facial suave antes de invertir tiempo en retoque manual.",
      },
      {
        title: "Haz todo dentro del mismo producto",
        body:
          "No necesitas una herramienta para restaurar, otra para colorizar y una tercera para animar. El flujo sigue conectado.",
      },
      {
        title: "Acelera la primera pasada sobre archivos familiares",
        body:
          "Cuando tienes muchas fotos por procesar, una página enfocada como esta ayuda a convertir una necesidad amplia en una ruta más clara de conversión.",
      },
    ],
    pricingTitle: "Un solo modelo de precios para todos los flujos de fotos antiguas",
    pricingBody:
      "Esta página no crea un producto aparte. Restaurar, colorizar y animar siguen usando los mismos créditos o suscripción; tú solo eliges el plan según tu volumen.",
    faqTitle: "Preguntas sobre restaurar fotos antiguas",
    faqs: [
      {
        question: "¿Esta página usa un checkout distinto al resto del sitio?",
        answer:
          "No. Es solo una entrada más enfocada para búsqueda. Sigue usando el mismo sistema de créditos, la misma página de precios y el mismo checkout de Stripe.",
      },
      {
        question: "¿Necesito Photoshop antes de usar este flujo?",
        answer:
          "No. La página está pensada para quien quiere una primera pasada rápida asistida por IA. Luego puedes exportar el resultado y afinarlo manualmente si hace falta.",
      },
      {
        question: "¿Qué tipos de fotos funcionan mejor?",
        answer:
          "Retratos, fotos familiares, copias de boda y escaneos con daño moderado suelen beneficiarse más. Un escaneo más limpio le da más detalle al modelo.",
      },
      {
        question: "¿Después podré colorizar y animar el resultado?",
        answer:
          "Sí. El pipeline sigue permitiendo restauración, colorización y animación en conjunto. Esta página solo presenta primero la promesa de restaurar.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Si la intención del visitante es más específica que una restauración general, llévalo a una página más precisa en vez de mandar cada consulta a la home.",
  },
  "colorize-old-photos": {
    title: "Coloriza fotos antiguas con IA",
    description:
      "Coloriza fotos antiguas con IA. Convierte fotos familiares en blanco y negro en color natural manteniendo el mismo flujo de restauración y precios.",
    keywords: [
      "colorizar fotos antiguas",
      "colorizador de fotos antiguas",
      "colorizar fotos en blanco y negro",
      "colorización de fotos con IA",
    ],
    cardTitle: "Colorizar fotos antiguas",
    cardDescription:
      "Convierte recuerdos en blanco y negro en color natural sin salir del mismo flujo de restauración y exportación.",
    eyebrow: "Colorización con IA",
    heroTitle: "Coloriza fotos familiares en blanco y negro dentro del mismo flujo",
    heroDescription:
      "Esta página está pensada para intención de colorización, pero el producto sigue limpiando y restaurando primero para que el resultado final se vea mejor.",
    heroHighlights: [
      "Lleva retratos en blanco y negro a un color natural",
      "Parte de una base restaurada en vez de colorear sobre daño",
      "Mantén los mismos créditos, planes y checkout",
    ],
    primaryCtaLabel: "Colorizar una foto ahora",
    uploadTitle: "Sube una foto para colorizar",
    uploadSubtitle:
      "La subida sigue usando el mismo pipeline, así que el color final parte de una imagen más limpia.",
    introTitle: "Por qué existe esta página",
    introBody:
      "Quien busca colorizar fotos antiguas suele interesarse menos por una explicación genérica de restauración y más por cuánto tarda una imagen en blanco y negro en verse viva otra vez. Esta página hace esa promesa más visible sin cambiar el modelo del producto.",
    showcaseTitle: "Ejemplos de colorización de fotos antiguas",
    showcaseSubtitle:
      "Antes y después centrados en tonos de piel, ropa y color ambiental en fotos familiares.",
    benefitsTitle: "Para qué funciona mejor este flujo",
    benefits: [
      {
        title: "Añade color creíble, no ruido sobresaturado",
        body:
          "El objetivo no es colorear por colorear, sino lograr un resultado lo bastante verosímil como para conservar la memoria original.",
      },
      {
        title: "Empieza con una imagen más limpia",
        body:
          "Como el mismo pipeline repara primero la foto, el color se añade sobre una base más sólida y no sobre un original desvaído y lleno de arañazos.",
      },
      {
        title: "Responde a una intención de búsqueda más concreta",
        body:
          "Las páginas dedicadas como esta suelen convertir mejor que una única home genérica cuando la persona ya sabe que quiere colorización.",
      },
    ],
    pricingTitle: "La colorización usa los mismos créditos y planes",
    pricingBody:
      "No necesitas una suscripción aparte solo para colorizar. El producto mantiene un único modelo de precios para restauración, colorización y animación.",
    faqTitle: "Preguntas sobre colorizar fotos antiguas",
    faqs: [
      {
        question: "¿Necesito un plan separado para colorizar?",
        answer:
          "No. Esta es una landing page enfocada, no un producto independiente. Los mismos créditos y la misma suscripción aplican en todo el sitio.",
      },
      {
        question: "¿La foto se repara antes de añadir color?",
        answer:
          "Sí. El flujo restaura primero la imagen para que el resultado final tenga mejor estructura y menos defectos visibles.",
      },
      {
        question: "¿Puedo seguir descargando la imagen final y la animación?",
        answer:
          "Sí. El checkout y el flujo de resultados son los mismos. Esta página solo cambia la forma en que el usuario entra al producto.",
      },
      {
        question: "¿Qué tipo de fotos funcionan mejor aquí?",
        answer:
          "Retratos en blanco y negro, fotos familiares y copias con desgaste moderado suelen dar mejores resultados. Un escaneo mejor suele producir decisiones de color más acertadas.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Conecta bien las páginas hermanas para que el tráfico de colorización pueda seguir hacia restauración, reparación o animación sin quedarse en un callejón sin salida.",
  },
  "animate-old-photos": {
    title: "Anima fotos antiguas con IA",
    description:
      "Anima fotos antiguas con IA. Convierte retratos restaurados en clips cortos con movimiento sutil y mantén el mismo sistema de créditos y checkout.",
    keywords: [
      "animar fotos antiguas",
      "animación de fotos antiguas",
      "dar vida a fotos antiguas",
      "animar fotos familiares",
    ],
    cardTitle: "Animar fotos antiguas",
    cardDescription:
      "Convierte un retrato restaurado en un clip corto con movimiento sin cambiar a otro producto ni a otro sistema de precios.",
    eyebrow: "Animación con IA",
    heroTitle: "Anima fotos antiguas después de limpiarlas y restaurarlas",
    heroDescription:
      "Esta página está hecha para visitantes que ya saben que quieren movimiento. Aun así, usa el mismo pipeline para reparar y colorizar antes de generar la animación.",
    heroHighlights: [
      "Crea clips cortos de retrato a partir de una sola subida",
      "Usa una imagen reparada y colorizada como base",
      "Mantén la animación dentro del mismo modelo de créditos y suscripción",
    ],
    primaryCtaLabel: "Animar una foto ahora",
    uploadTitle: "Sube una foto para animar",
    uploadSubtitle:
      "Una sola subida sigue alimentando restauración, colorización y animación, incluso cuando la intención principal es el movimiento.",
    introTitle: "Por qué existe esta página",
    introBody:
      "Quien busca animar fotos antiguas suele querer pruebas de que el resultado se verá creíble, no otra explicación genérica sobre restauración. Esta landing page pone el foco en el movimiento sin dejar de describir el flujo completo.",
    showcaseTitle: "Ejemplos de fotos antiguas animadas",
    showcaseSubtitle:
      "Ejemplos breves de movimiento basados en retratos familiares restaurados y fotos antiguas.",
    benefitsTitle: "Para qué funciona mejor este flujo",
    benefits: [
      {
        title: "Habla de movimiento, no de restauración genérica",
        body:
          "Quien llega por animación suele estar más abajo en el embudo. Necesita comprobar que el resultado se siente vivo sin verse artificial.",
      },
      {
        title: "Usa el mismo pipeline que el resto de páginas",
        body:
          "La animación no se vende como una línea de producto separada. Sigue dentro del mismo flujo de subida, lógica de pago y sistema de resultados.",
      },
      {
        title: "Captura una consulta de alta intención con una sola página",
        body:
          "Las páginas enfocadas ofrecen una promesa más limpia para SEO y reducen la distancia entre la consulta y la experiencia real de aterrizaje.",
      },
    ],
    pricingTitle: "La animación sigue formando parte del mismo producto",
    pricingBody:
      "Esta página no separa la animación en otro sistema de precios. El usuario sigue comprando créditos o una suscripción dentro del mismo modelo unificado.",
    faqTitle: "Preguntas sobre animar fotos antiguas",
    faqs: [
      {
        question: "¿La animación se vende como un producto separado?",
        answer:
          "No. Esta página es solo una entrada especializada para intención de búsqueda. La facturación y el checkout siguen compartidos con restauración y colorización.",
      },
      {
        question: "¿La imagen se restaura antes de animarla?",
        answer:
          "Sí. El pipeline sigue reparando y mejorando la imagen antes de generar la animación, lo que normalmente da un clip final más sólido.",
      },
      {
        question: "¿Qué fotos se animan mejor?",
        answer:
          "Los retratos con un rostro visible suelen funcionar mejor porque el movimiento sutil se percibe más claramente cuando el sujeto está centrado y razonablemente nítido.",
      },
      {
        question: "¿Puedo usar los mismos créditos también en otras páginas?",
        answer:
          "Sí. Los mismos créditos y planes valen para todo el sitio. Estas páginas son entradas distintas, no carteras distintas.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Quien busca movimiento a menudo también necesita restauración o color. Mantén las páginas hermanas bien conectadas para que la sesión continúe.",
  },
  "repair-damaged-old-photos": {
    title: "Repara fotos antiguas dañadas con IA",
    description:
      "Repara fotos antiguas dañadas con IA. Limpia arañazos, polvo, contraste desvaído y papel deteriorado dentro del mismo flujo de restauración, color y animación.",
    keywords: [
      "reparar fotos antiguas dañadas",
      "arreglar fotos antiguas descoloridas",
      "reparar fotos rayadas",
      "reparar fotos familiares dañadas",
    ],
    cardTitle: "Reparar fotos antiguas dañadas",
    cardDescription:
      "Habla directamente de intención relacionada con arañazos, desgaste y amarilleo, pero conserva el mismo flujo de subida y pago.",
    eyebrow: "Reparación de daño",
    heroTitle: "Repara arañazos, desgaste y daños en fotos familiares antiguas",
    heroDescription:
      "Esta página estrecha la promesa hacia el daño físico para que el visitante entienda que el producto está hecho para copias gastadas, no solo para retratos limpios en blanco y negro.",
    heroHighlights: [
      "Corrige arañazos, polvo, pliegues y contraste lavado",
      "Usa el mismo flujo de subida que el resto de páginas",
      "Mantén una sola cartera de créditos para todo el producto",
    ],
    primaryCtaLabel: "Reparar una foto dañada",
    uploadTitle: "Sube una foto dañada",
    uploadSubtitle:
      "Empieza con una sola subida y deja que el mismo pipeline repare la imagen antes de generar color o animación.",
    introTitle: "Por qué existe esta página",
    introBody:
      "Algunos visitantes no buscan restauración en general, sino un problema muy concreto: arañazos, desvanecimiento, amarilleo y daño en el papel. Esta página hace explícito ese problema para que la experiencia de aterrizaje se parezca más a la búsqueda.",
    showcaseTitle: "Ejemplos de reparación de daño",
    showcaseSubtitle:
      "Ejemplos centrados en contraste desvaído, defectos de superficie visibles y desgaste típico de fotos familiares.",
    benefitsTitle: "Para qué funciona mejor este flujo",
    benefits: [
      {
        title: "Usa el lenguaje que la gente realmente busca",
        body:
          "Una página dedicada a reparación se alinea mejor con términos como foto descolorida, rayada, dañada o gastada que una home genérica.",
      },
      {
        title: "Repara primero y decide luego el trabajo manual",
        body:
          "Deja que la IA haga la primera pasada sobre el daño repetitivo para que solo dediques edición manual a los casos especiales.",
      },
      {
        title: "Mantén la misma ruta de conversión",
        body:
          "La landing es más específica, pero el modelo de negocio sigue unificado: mismos créditos, mismo checkout y misma pantalla de resultados.",
      },
    ],
    pricingTitle: "Las páginas de reparación no necesitan otra lógica de cobro",
    pricingBody:
      "Esta página está pensada para intención de búsqueda, no para un nuevo nivel de precios. Mantén los mismos planes y deja que el usuario entre al flujo compartido desde una página más precisa.",
    faqTitle: "Preguntas sobre reparar fotos antiguas dañadas",
    faqs: [
      {
        question: "¿Es una herramienta distinta de la página de restauración?",
        answer:
          "No a nivel de facturación. Es una entrada más específica para usuarios cuya intención gira en torno a reparar daño físico más que a restauración general.",
      },
      {
        question: "¿Qué tipos de daño suelen poder repararse?",
        answer:
          "Desvanecimiento, contraste bajo, polvo, arañazos y desgaste moderado de superficie son los casos más comunes. La pérdida severa de detalle puede requerir retoque manual después del paso de IA.",
      },
      {
        question: "¿El mismo flujo también puede colorizar y animar la foto?",
        answer:
          "Sí. El flujo sigue siendo el mismo de extremo a extremo. Esta página solo presenta primero la propuesta alrededor de la reparación.",
      },
      {
        question: "¿Tengo que comprar un paquete especial para reparar daños?",
        answer:
          "No. Los mismos créditos y planes de suscripción aplican en todo el sitio.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Usa páginas relacionadas para llevar al usuario desde un problema muy concreto hacia el recorrido más amplio del producto sin obligarlo a volver a una home genérica.",
  },
};
