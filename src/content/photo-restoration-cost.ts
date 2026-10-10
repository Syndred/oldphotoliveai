export const PHOTO_RESTORATION_COST = {
  path: "/photo-restoration-cost",
  title: "Photo Restoration Cost – What You Pay for AI vs Manual Restoration",
  description:
    "Compare per-photo AI restoration with a manual studio quote, understand what changes the cost, and decide when a $1.99 photo workflow fits your project.",
  keywords: ["photo restoration cost", "AI photo restoration price", "manual photo restoration", "photo restoration pricing"],
  eyebrow: "Photo restoration guide",
  heading: "What does photo restoration cost?",
  introduction:
    "The useful comparison is what you need repaired and who will check the result. An AI workflow offers a fixed price for one processing job. A manual restorer can quote for the damage, the requested edits, and the time needed to inspect and retouch your photograph.",
  comparison: [
    {
      method: "OldPhotoLive AI",
      price: "$1.99 per uploaded photo and selected workflow",
      includes: "An AI processing job and the completed result without a watermark; no subscription.",
      considerations: "Images up to 2K. Inspect faces and fine details yourself; a new photo or different workflow is a separate job.",
    },
    {
      method: "Manual restoration studio",
      price: "Quoted after inspection",
      includes: "The edits, deliverables, and revision terms agreed with the restorer.",
      considerations: "Ask about the extent of damage, output size, human review, revisions, turnaround, and permission to use the image.",
    },
  ],
  // TODO: Add third-party price figures only after verifying a current first-party studio price list.
  // No external quote range is inferred from competitor articles or search snippets.
  sections: [
    {
      heading: "What changes a manual restoration quote?",
      paragraphs: [
        "A faded but intact print is a different job from a photograph with a missing face, a torn corner, or damage across lettering. Ask the studio to inspect a scan before giving a quote, and explain whether you need cleanup, reconstruction, colorization, or a print-ready file.",
        "A quote should state what is included: the number of images, output dimensions, review and revision terms, delivery date, and whether printing is a separate purchase. Keep the original scan and agree on how reconstructed areas will be handled.",
      ],
    },
    {
      heading: "When is paying for an AI restoration useful?",
      paragraphs: [
        "AI can be a practical first pass for an intact family portrait with faded contrast, moderate scratches, dust, or soft detail. A fixed per-photo price is easy to evaluate when you need one image for a family album, a tribute slideshow, or a personal keepsake.",
        "Start with a clear scan. JPEG, PNG, and WebP uploads are supported up to 10 MB. The finished image fits within 2048 × 2048 pixels while preserving its aspect ratio; smaller generated images are not enlarged. Check the actual dimensions before ordering a large print.",
        "For OldPhotoLive AI, select the tool you need before paying. One order covers the uploaded photo and that workflow. It does not include unlimited photos or additional independent processing jobs.",
      ],
    },
    {
      heading: "When should you consider a human restorer?",
      paragraphs: [
        "Manual inspection is useful when important information is missing, a face has been heavily damaged, handwriting must remain accurate, or you need careful local edits with a documented review process. Describe those priorities before agreeing to the work.",
        "AI can invent texture or alter facial features, small lettering, and objects. Colorization predicts plausible colors; it does not establish the original shades of a uniform, dress, flag, or room. Even a convincing result should be compared with the source and reliable references.",
      ],
    },
    {
      heading: "Preserve the photograph's authenticity",
      paragraphs: [
        "For family archives, genealogy, or historical work, store the untouched scan as your master file and save edited copies separately. Label AI restoration and colorization so later viewers can distinguish the source from an interpretation.",
        "Record the date, people, location, and any known references with the photograph. If accuracy is essential, discuss restoration standards with an archivist or restorer and document which parts of the image were reconstructed.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is the $1.99 payment a subscription?",
      answer: "No. It is a one-time payment for one uploaded photo and its selected workflow. The completed result includes downloads without a watermark. Another photo or a different processing job requires its own order.",
    },
    {
      question: "Does the AI price include printing or manual retouching?",
      answer: "No. The order covers digital AI processing and the finished downloadable result. Printing, shipping, and manual retouching are separate services; check the output dimensions before using a print provider.",
    },
    {
      question: "What happens if a paid processing job fails?",
      answer: "A confirmed technical failure allows one retry at no extra cost. If delivery is confirmed impossible, the order is refunded. Content-policy rejections are not refunded. Uncertain provider or payment states must be reviewed first, and refund arrival depends on the payment provider and bank.",
    },
    {
      question: "How long does AI restoration take?",
      answer: "Processing usually takes a few minutes. Demand, provider availability, and the image can extend the wait, so this is not a guaranteed delivery time. A manual studio should confirm its own turnaround in the quote.",
    },
    {
      question: "Is the lowest price always the best choice?",
      answer: "Choose based on the photograph's condition and your requirements. A quick AI pass may fit a personal album; an irreplaceable image with missing information may need human inspection, careful revisions, or archival advice.",
    },
  ],
} as const;
