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
      "Exporta una imagen más limpia lista para guardar o compartir",
    ],
    primaryCtaLabel: "Restaurar una foto ahora",
    uploadTitle: "Sube una foto para restaurar",
    uploadSubtitle:
      "Sube un escaneo o una copia familiar para limpiar daños, recuperar detalle y crear una mejor imagen base en minutos.",
    introTitle: "Recupera recuerdos desvanecidos",
    introBody:
      "Muchas fotos familiares antiguas pierden contraste, acumulan arañazos y se ven borrosas justo en las zonas más importantes. Este flujo te da una primera restauración rápida y natural para que retratos, bodas y escaneos de álbum vuelvan a ser utilizables.",
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
          "Cuando tienes muchas fotos antiguas por revisar, una restauración rápida te ayuda a decidir cuáles merece la pena guardar, imprimir o retocar más.",
      },
    ],
    pricingTitle: "Elige el plan según tu archivo",
    pricingBody:
      "Compra créditos para restauraciones ocasionales o elige Professional si trabajas con álbumes, archivos familiares o pedidos de clientes en mayor volumen.",
    faqTitle: "Preguntas sobre restaurar fotos antiguas",
    faqs: [
      {
        question: "¿Puedo restaurar una foto sin Photoshop?",
        answer:
          "Sí. Este flujo está pensado para darte una primera restauración rápida con IA antes de decidir si todavía hace falta retoque manual.",
      },
      {
        question: "¿Qué tipos de fotos funcionan mejor?",
        answer:
          "Retratos, fotos familiares, copias de boda y escaneos con daño moderado suelen beneficiarse más. Un escaneo más limpio le da más detalle al modelo.",
      },
      {
        question: "¿Puedo colorizar o animar la imagen restaurada después?",
        answer:
          "Sí. Cuando la imagen ya está limpia, puedes seguir con colorización o animación desde la misma cuenta.",
      },
      {
        question: "¿Cómo elijo entre créditos y Professional?",
        answer:
          "Los créditos van bien para trabajos puntuales, mientras que Professional encaja mejor si restauras fotos con frecuencia o necesitas más volumen cada mes.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Después de restaurar, puedes seguir mejorando la misma foto con reparación de daño, colorización o animación.",
  },
  "colorize-old-photos": {
    title: "Coloriza fotos antiguas con IA",
    description:
      "Coloriza fotos antiguas con IA. Convierte fotos familiares en blanco y negro en color natural con mejor detalle y tonos equilibrados.",
    keywords: [
      "colorizar fotos antiguas",
      "colorizador de fotos antiguas",
      "colorizar fotos en blanco y negro",
      "colorización de fotos con IA",
    ],
    cardTitle: "Colorizar fotos antiguas",
    cardDescription:
      "Convierte recuerdos en blanco y negro en color natural con rostros, ropa y fondo más definidos.",
    eyebrow: "Colorización con IA",
    heroTitle: "Coloriza fotos familiares en blanco y negro de forma natural",
    heroDescription:
      "Sube un retrato o una foto familiar en blanco y negro para añadir color realista sin perder detalle facial, textura de la ropa ni equilibrio de la escena.",
    heroHighlights: [
      "Lleva retratos en blanco y negro a un color natural",
      "Parte de una base restaurada en vez de colorear sobre daño",
      "Mantén creíbles los tonos de piel, la ropa y el fondo",
    ],
    primaryCtaLabel: "Colorizar una foto ahora",
    uploadTitle: "Sube una foto para colorizar",
    uploadSubtitle:
      "Sube un escaneo o una copia en blanco y negro y genera un resultado más limpio y con color natural en una sola pasada.",
    introTitle: "Añade color sin perder la sensación original",
    introBody:
      "Las fotos antiguas necesitan algo más que un filtro. Este flujo mejora primero la imagen y después añade color con un aspecto más cercano a una copia real que a un efecto artificial.",
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
        title: "Más fácil de compartir e imprimir",
        body:
          "Las fotos colorizadas se comparten mejor con la familia, funcionan bien en proyectos conmemorativos y quedan mejor en álbumes o regalos impresos.",
      },
    ],
    pricingTitle: "Elige un plan para una foto o para un lote completo",
    pricingBody:
      "Usa un paquete de créditos para trabajos puntuales de colorización, o elige Professional si procesas álbumes, archivos familiares o pedidos de clientes.",
    faqTitle: "Preguntas sobre colorizar fotos antiguas",
    faqs: [
      {
        question: "¿Necesito un plan separado para colorizar?",
        answer:
          "No. Cualquier plan de pago de tu cuenta puede usarse para colorizar.",
      },
      {
        question: "¿La foto se repara antes de añadir color?",
        answer:
          "Sí. El flujo restaura primero la imagen para que el resultado final tenga mejor estructura y menos defectos visibles.",
      },
      {
        question: "¿Puedo seguir descargando la imagen final y la animación?",
        answer:
          "Sí. Puedes descargar la imagen final tras la colorización y, si quieres, continuar luego con animación.",
      },
      {
        question: "¿Qué tipo de fotos funcionan mejor aquí?",
        answer:
          "Retratos en blanco y negro, fotos familiares y copias con desgaste moderado suelen dar mejores resultados. Un escaneo mejor suele producir decisiones de color más acertadas.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Si la foto también necesita limpieza o movimiento, continúa con restauración, reparación de daño o animación.",
  },
  "animate-old-photos": {
    title: "Anima fotos antiguas con IA",
    description:
      "Anima fotos antiguas con IA. Convierte retratos restaurados en clips cortos con movimiento sutil y natural.",
    keywords: [
      "animar fotos antiguas",
      "animación de fotos antiguas",
      "dar vida a fotos antiguas",
      "animar fotos familiares",
    ],
    cardTitle: "Animar fotos antiguas",
    cardDescription:
      "Convierte un retrato restaurado en un clip corto con movimiento suave y un fotograma más limpio.",
    eyebrow: "Animación con IA",
    heroTitle: "Anima fotos antiguas después de limpiarlas y restaurarlas",
    heroDescription:
      "Sube un retrato y genera un clip corto con movimiento después de limpiar la foto y dejarla lista para animación.",
    heroHighlights: [
      "Crea clips cortos de retrato a partir de una sola subida",
      "Usa una imagen reparada y colorizada como base",
      "Crea movimiento suave que siga encajando con recuerdos familiares",
    ],
    primaryCtaLabel: "Animar una foto ahora",
    uploadTitle: "Sube una foto para animar",
    uploadSubtitle:
      "Los retratos con rostros claros y sujetos centrados suelen dar el movimiento más natural.",
    introTitle: "Convierte un retrato quieto en un recuerdo vivo",
    introBody:
      "La animación funciona mejor cuando la foto está limpia, el sujeto se distingue bien y el movimiento final sigue siendo sutil. Los mejores clips suelen sentirse emotivos y contenidos, no exagerados.",
    showcaseTitle: "Ejemplos de fotos antiguas animadas",
    showcaseSubtitle:
      "Ejemplos breves de movimiento basados en retratos familiares restaurados y fotos antiguas.",
    benefitsTitle: "Para qué funciona mejor este flujo",
    benefits: [
      {
        title: "Crea algo que puedas compartir al instante",
        body:
          "Los clips cortos funcionan muy bien para homenajes, grupos familiares y publicaciones sociales que vuelven a poner en circulación retratos antiguos.",
      },
      {
        title: "Empieza con un retrato ya reparado",
        body:
          "Cuanto más limpia esté la imagen de origen, más creíbles suelen verse los pequeños movimientos de ojos, boca y cabeza.",
      },
      {
        title: "Mantén el movimiento sutil y creíble",
        body:
          "En retratos familiares antiguos suele funcionar mejor un movimiento ligero que un efecto exagerado o demasiado rápido.",
      },
    ],
    pricingTitle: "Elige créditos o acceso Professional",
    pricingBody:
      "Usa créditos para animaciones puntuales, o cambia a Professional si creas clips con frecuencia a partir de archivos familiares o trabajos de clientes.",
    faqTitle: "Preguntas sobre animar fotos antiguas",
    faqs: [
      {
        question: "¿Hay que reparar la foto antes de animarla?",
        answer:
          "Los mejores resultados llegan con una imagen limpia. Este flujo prepara la foto antes de generar movimiento para que el clip final se vea más estable.",
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
        question: "¿Puedo usar mi acceso de pago también para animación?",
        answer:
          "Sí. En cuanto compras un plan de pago, también puedes usarlo para animación.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Si la foto necesita limpieza o color antes de animarla, explora las herramientas de restauración, reparación y colorización.",
  },
  "repair-damaged-old-photos": {
    title: "Repara fotos antiguas dañadas con IA",
    description:
      "Repara fotos antiguas dañadas con IA. Limpia arañazos, polvo, contraste desvaído y papel deteriorado para recuperar copias familiares dañadas.",
    keywords: [
      "reparar fotos antiguas dañadas",
      "arreglar fotos antiguas descoloridas",
      "reparar fotos rayadas",
      "reparar fotos familiares dañadas",
    ],
    cardTitle: "Reparar fotos antiguas dañadas",
    cardDescription:
      "Elimina arañazos, polvo, pliegues y amarilleo de copias gastadas y escaneos antiguos.",
    eyebrow: "Reparación de daño",
    heroTitle: "Repara arañazos, desgaste y daños en fotos familiares antiguas",
    heroDescription:
      "Usa IA para reparar el daño visible en copias antiguas, incluidos arañazos superficiales, polvo, pliegues, desvanecimiento y papel amarillento.",
    heroHighlights: [
      "Corrige arañazos, polvo, pliegues y contraste lavado",
      "Recupera claridad en rostros, ropa y detalles finos",
      "Prepara fotos dañadas para guardar, compartir o seguir restaurando",
    ],
    primaryCtaLabel: "Reparar una foto dañada",
    uploadTitle: "Sube una foto dañada",
    uploadSubtitle:
      "Sube un escaneo dañado o una foto hecha con el móvil y obtén una primera reparación más limpia en pocos minutos.",
    introTitle: "Repara el daño antes de que vaya a más",
    introBody:
      "Las copias antiguas suelen sufrir arañazos, polvo, pliegues, desvanecimiento y desgaste del papel. Si limpias primero ese daño visible, luego resulta mucho más fácil conservar, compartir o seguir retocando la imagen.",
    showcaseTitle: "Ejemplos de reparación de daño",
    showcaseSubtitle:
      "Ejemplos centrados en contraste desvaído, defectos de superficie visibles y desgaste típico de fotos familiares.",
    benefitsTitle: "Para qué funciona mejor este flujo",
    benefits: [
      {
        title: "Sirve para el daño más común en copias impresas",
        body:
          "Es especialmente útil para contraste apagado, arañazos superficiales, puntos de polvo, marcas de pliegue y desgaste habitual de álbumes y cajones.",
      },
      {
        title: "Repara primero y decide luego el trabajo manual",
        body:
          "Deja que la IA haga la primera pasada sobre el daño repetitivo para que solo dediques edición manual a los casos especiales.",
      },
      {
        title: "Deja la foto lista para el siguiente paso",
        body:
          "Cuando desaparece el daño más evidente, la imagen queda mejor preparada para colorizar, animar, imprimir o recibir retoque manual.",
      },
    ],
    pricingTitle: "Elige un plan para unas pocas reparaciones o para un archivo completo",
    pricingBody:
      "Compra créditos para unas pocas copias dañadas o elige Professional si restauras álbumes, archivos familiares o colecciones de clientes.",
    faqTitle: "Preguntas sobre reparar fotos antiguas dañadas",
    faqs: [
      {
        question: "¿Sirve para copias rayadas y amarillentas?",
        answer:
          "Sí. Está pensada para problemas habituales como arañazos, desvanecimiento, amarilleo, polvo y desgaste moderado de la superficie.",
      },
      {
        question: "¿Qué tipos de daño suelen poder repararse?",
        answer:
          "Desvanecimiento, contraste bajo, polvo, arañazos y desgaste moderado de superficie son los casos más comunes. La pérdida severa de detalle puede requerir retoque manual después del paso de IA.",
      },
      {
        question: "¿El mismo flujo también puede colorizar y animar la foto?",
        answer:
          "Sí. Una vez limpio el daño visible, puedes continuar con colorización o animación.",
      },
      {
        question: "¿Tengo que comprar un paquete especial para reparar daños?",
        answer:
          "No. Solo tienes que elegir el plan de pago que mejor encaje con la cantidad de fotos que quieres reparar.",
      },
    ],
    relatedTitle: "Más flujos para fotos antiguas",
    relatedDescription:
      "Después de reparar el daño, puedes seguir mejorando la foto con restauración, colorización o animación.",
  },
};
