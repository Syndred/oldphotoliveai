export const ANIMATION_LANDING_PAGE_SLUGS = [
  "animate-free",
  "bring-to-life",
  "to-video",
  "animate",
] as const;

export type AnimationLandingPageSlug =
  (typeof ANIMATION_LANDING_PAGE_SLUGS)[number];

export interface AnimationLandingPageDocument {
  slug: AnimationLandingPageSlug;
  path: string;
  title: string;
  description: string;
  keywords: string[];
  cardTitle: string;
  cardDescription: string;
  eyebrow: string;
  h1: string;
  heroDescription: string;
  highlights: string[];
  benefits: Array<{ title: string; body: string }>;
  guideSections: Array<{ title: string; body: string }>;
  faqTitle: string;
  faqs: Array<{ question: string; answer: string }>;
}

export const ANIMATION_LANDING_PAGES: Record<
  AnimationLandingPageSlug,
  AnimationLandingPageDocument
> = {
  "animate-free": {
    slug: "animate-free",
    path: "/animate-free",
    title: "Animate Old Photos with AI Free - Bring Photos to Life | OldPhotoLiveAI",
    description:
      "Animate an old photo with AI after sign-in using your daily free account quota. Upload a clear portrait and review a watermarked 480p preview.",
    keywords: [
      "animate photos online free",
    ],
    cardTitle: "Free AI photo animation",
    cardDescription:
      "Create a subtle animated preview from a clear family portrait with AI.",
    eyebrow: "Free AI animation",
    h1: "Animate Old Photos with AI Free",
    heroDescription:
      "Turn a still family portrait into a short video after sign-in. The daily free account quota provides a watermarked 480p preview; start with a clear photo and keep the movement natural.",
    highlights: [
      "Use one old portrait as the source for a short AI video preview.",
      "Gentle motion works best for faces, memorial photos, and family archives.",
      "See the result before choosing an HD, watermark-free export.",
    ],
    benefits: [
      {
        title: "Start with a free preview",
        body:
          "A preview lets you check whether the face, framing, and motion feel right before you spend credits on a higher-quality version.",
      },
      {
        title: "Keep memories recognizable",
        body:
          "Subtle movement around a portrait can add presence without turning a family photograph into an exaggerated effect.",
      },
      {
        title: "Prepare the source first",
        body:
          "A clean scan with a visible face gives the animation model more real detail to work with and usually leads to a steadier result.",
      },
    ],
    guideSections: [
      {
        title: "What free AI photo animation is good for",
        body:
          "Free AI photo animation is a practical way to test a memorial portrait, a wedding photo, or a page from a family album before planning a bigger project. A short preview can show a slight head movement, a natural facial expression, or gentle depth in the scene. It is most useful when you want a shareable first version without installing editing software or learning a timeline editor.",
      },
      {
        title: "Choose an old photo that will animate well",
        body:
          "Use a portrait with one clearly visible face, even lighting, and enough room around the subject. Scans are usually better than compressed copies from a messaging app. If the print has deep scratches, harsh glare, or a very small face, restore it first. The source image controls the result more than any prompt: the clearer the eyes, mouth, and outline, the more believable the video can feel.",
      },
      {
        title: "Use a preview before committing to an export",
        body:
          "Watch the first video all the way through and check that the face stays stable, the framing does not jump, and the movement matches the tone of the image. A free preview is not a replacement for an archival master, but it is the right way to decide whether to create an HD export. Keep the original scan even after you download an animated copy.",
      },
    ],
    faqTitle: "Free AI photo animation questions",
    faqs: [
      {
        question: "Can I animate old photos with AI for free?",
        answer:
          "Yes. Sign in and use the shared daily free account quota for a watermarked 480p preview, then choose a paid option only if you need more processing or a higher-quality export.",
      },
      {
        question: "What old photos work best for animation?",
        answer:
          "Clear portraits with one visible face, usable lighting, and enough detail around the eyes and mouth generally produce the most natural motion.",
      },
      {
        question: "Do I need video editing experience?",
        answer:
          "No. Upload the photo, let the AI create the short video, then review the result. No timeline software or manual keyframes are required.",
      },
      {
        question: "Can I animate a damaged photo?",
        answer:
          "You can, but restoring scratches, fading, and low contrast first usually gives the animation a cleaner source image.",
      },
      {
        question: "Will the animation change the original photo?",
        answer:
          "No. The video is generated from the uploaded copy. Keep your original scan as the archival source.",
      },
    ],
  },
  "bring-to-life": {
    slug: "bring-to-life",
    path: "/bring-to-life",
    title: "Bring Old Photos to Life with AI | OldPhotoLive AI",
    description:
      "Bring old photos to life with AI free online. Turn a family portrait into a short, natural video and share a memory in a new way.",
    keywords: [
      "bring old photos to life",
      "bring family photos to life",
      "AI memory video from photo",
    ],
    cardTitle: "Bring photos to life",
    cardDescription:
      "Turn a meaningful portrait into a gentle memory video with AI.",
    eyebrow: "Memory video maker",
    h1: "Bring Old Photos to Life with AI",
    heroDescription:
      "Bring a favorite old photo to life with AI by creating a brief, natural-motion video from a single portrait. It is made for meaningful memories, not cartoon effects.",
    highlights: [
      "Create a respectful short video from one family portrait.",
      "Use the result in memorials, family stories, and genealogy projects.",
      "Try the motion first, then choose a higher-quality version when it feels right.",
    ],
    benefits: [
      {
        title: "Give a still memory a new form",
        body:
          "A small amount of movement can make a familiar face feel present again in a family slideshow or a personal remembrance.",
      },
      {
        title: "Keep the treatment respectful",
        body:
          "The strongest old-photo animations use restrained motion that stays close to the original expression and framing.",
      },
      {
        title: "Share without complex editing",
        body:
          "Generate a short clip from one upload, then use it as a starting point for a tribute, a digital album, or a family group chat.",
      },
    ],
    guideSections: [
      {
        title: "A thoughtful way to bring family photos to life",
        body:
          "When people say they want to bring an old photo to life, they often want a more immediate connection to a person they remember. AI can create that feeling with a brief, restrained animation from a portrait. It works especially well for a grandparent's photograph, a wedding portrait, a school picture, or a family-history image that already carries emotional meaning. The goal is a moving memory, not a dramatic rewrite of the past.",
      },
      {
        title: "How to make the result feel natural",
        body:
          "Begin with the best version of the photo you have. Crop only when it helps the face fill more of the frame, but keep the shoulders and background if they help the portrait feel grounded. Avoid photos with several overlapping faces when possible. Once the video is generated, compare it with the original and choose the version that preserves the person's character rather than simply adding the most movement.",
      },
      {
        title: "Ideas for using an animated old photo",
        body:
          "A short clip can be placed at the opening of a memorial video, included in a family-history presentation, shared on an anniversary, or saved alongside the original scan in a digital archive. Add context outside the clip: the person's name, the date, the location, and the story behind the photo. Those details make the finished memory more useful to future family members than the animation alone.",
      },
    ],
    faqTitle: "Questions about bringing old photos to life",
    faqs: [
      {
        question: "Can AI bring old photos to life for free?",
        answer:
          "The dedicated animation tool lets signed-in free accounts use one shared daily allowance for a watermarked 480p preview. Paid options add capacity and export choices.",
      },
      {
        question: "Is AI animation suitable for memorial photos?",
        answer:
          "It can be, especially when you use a clear, respectful portrait and choose subtle movement that honors the original image.",
      },
      {
        question: "Can I use the video in a family slideshow?",
        answer:
          "Yes. A short generated clip can be a meaningful part of a family slideshow, tribute video, or digital album.",
      },
      {
        question: "Should I restore the photo before animation?",
        answer:
          "For faded, scratched, or low-contrast prints, restoration first often gives the animation a more stable face and cleaner edges.",
      },
      {
        question: "Does the AI invent historical details?",
        answer:
          "The animation creates motion from the visible image. Review the result carefully and keep the original photo as the historical record.",
      },
    ],
  },
  "to-video": {
    slug: "to-video",
    path: "/to-video",
    title: "Photo to Video AI for Old Photos | OldPhotoLive AI",
    description:
      "Use photo to video AI for an old portrait. Sign in, upload a clear image, and use your shared daily free quota for a watermarked 480p preview.",
    keywords: [
      "photo to video AI",
      "old photo to video AI free online",
      "convert old photo to video AI",
      "photo to video AI free",
    ],
    cardTitle: "Old photo to video",
    cardDescription:
      "Convert a clear old portrait into a short AI-generated video online.",
    eyebrow: "Photo-to-video AI",
    h1: "Turn an Old Photo into Video with AI",
    heroDescription:
      "Convert an old photo to a short video online with AI. Upload a portrait, review the generated motion, and use the preview to decide whether to export a higher-quality version.",
    highlights: [
      "Upload a still photo and receive a short video without editing software.",
      "Portraits with a centered, visible face are the most reliable input.",
      "Review the preview before you choose HD output or additional creations.",
    ],
    benefits: [
      {
        title: "A direct photo-to-video workflow",
        body:
          "The process stays simple: choose the source photo, let AI create motion, then evaluate the finished clip instead of building a video from scratch.",
      },
      {
        title: "Built for old family portraits",
        body:
          "Older prints can become video sources when the main face is readable and the image has enough detail to guide the movement.",
      },
      {
        title: "Preview before you need more output",
        body:
          "A short preview makes it easier to judge whether the source, crop, and animation are suitable for a final shareable export.",
      },
    ],
    guideSections: [
      {
        title: "How old photo to video AI works",
        body:
          "Photo-to-video AI starts with the visual information already present in your image. For a portrait, it uses the face, pose, clothing, and background to generate a short sequence with controlled motion. It does not require a separate video shoot or manual animation software. The result is most convincing when the input is a stable, well-lit photograph rather than a tiny, heavily compressed thumbnail.",
      },
      {
        title: "Prepare an old photo for video conversion",
        body:
          "Scan the photo at the highest practical resolution and avoid uploading a screenshot of the scan. If the original is glossy, reduce glare before photographing it. Pick one person as the visual focus and avoid tight crops that cut through the forehead or chin. For a damaged print, run a restoration pass first so the generated video is based on facial features rather than scratches, folds, or noise.",
      },
      {
        title: "Check the video before you share it",
        body:
          "Watch for stable facial features, natural pacing, and a frame that stays close to the source photo. A good old-photo video is usually short and subtle. Save the original image separately, label the final file with the person and date when known, and tell family members that it is an AI-generated animation. Clear labeling protects the value of the original historical image.",
      },
    ],
    faqTitle: "Old photo to video AI questions",
    faqs: [
      {
        question: "Can I convert an old photo to video with AI for free?",
        answer:
          "Yes. Sign in and use the shared daily free account quota for a watermarked 480p preview, then choose a higher-quality output only when you need it.",
      },
      {
        question: "Do I need to install an app?",
        answer:
          "No. The photo-to-video workflow runs online in your browser, so there is no desktop editing application to install.",
      },
      {
        question: "How long is the generated video?",
        answer:
          "The tool creates a short animation designed for sharing and reviewing. The exact duration can depend on the output selected.",
      },
      {
        question: "Can I convert group photos to video?",
        answer:
          "A group photo can work, but a single clear subject generally produces the most stable and natural-looking result.",
      },
      {
        question: "Is my original photo replaced?",
        answer:
          "No. The generated video is a new output. Your source image remains separate and should be kept as your archival copy.",
      },
    ],
  },
  animate: {
    slug: "animate",
    path: "/animate",
    title: "Animate Old Photos with AI – Online Photo Animation",
    description:
      "Animate old photos with AI after sign-in. Use your shared daily free quota for a watermarked 480p preview, then review the motion before exporting.",
    keywords: [
      "animate old photos",
      "animate photos",
      "animate photo",
      "photo animation",
      "animate picture AI",
    ],
    cardTitle: "Animate old photos",
    cardDescription:
      "Make an old portrait move with subtle AI animation online.",
    eyebrow: "AI photo animation",
    h1: "Animate Old Photos with AI",
    heroDescription:
      "Animate old photos online with AI and turn a familiar portrait into a short, natural-motion clip. Sign in to use the shared daily free quota for a watermarked 480p preview, then let the result guide the final export.",
    highlights: [
      "Animate a vintage portrait from a single uploaded photo.",
      "Use short, natural motion that suits family memories and archives.",
      "Restore or colorize the source first when the print needs more detail.",
    ],
    benefits: [
      {
        title: "Make old portraits feel present",
        body:
          "A small animated moment can add emotion to a photograph while keeping the original face, clothing, and setting recognizable.",
      },
      {
        title: "Create online from one image",
        body:
          "There is no need to film a new scene or learn manual animation. Upload the image and review the generated video in one workflow.",
      },
      {
        title: "Continue from restoration or color",
        body:
          "When an old photo is faded or black and white, a cleaner source can improve the final motion and give the clip more visual clarity.",
      },
    ],
    guideSections: [
      {
        title: "Animate old photos without losing their character",
        body:
          "The best AI photo animation begins with respect for the original image. A family portrait often carries details that matter: an expression, a uniform, a hairstyle, a room, or a date on the back of the print. Rather than replacing those details, the tool turns the still image into a brief moving moment. Keep the animation short and compare it with the source so the final result still feels like the person and photograph you intended to preserve.",
      },
      {
        title: "From scan to animated portrait",
        body:
          "Use a flat scan when available, because it avoids glare and preserves more original texture. Make sure the face is large enough to read clearly, then upload the image to generate a preview. If the portrait is damaged, restore it before animation. If it is black and white, you can choose to colorize it first, but color is optional: a well-restored monochrome image can also create a strong animation.",
      },
      {
        title: "When a subtle animation is the better choice",
        body:
          "Subtle motion is ideal for family tribute videos, local-history displays, anniversary gifts, and digital archives where the photograph itself should remain the focus. Save the source scan, the restored image if you made one, and the final video as separate files. That simple record makes it clear which version is original, which one was enhanced, and which one was generated for storytelling.",
      },
    ],
    faqTitle: "Questions about animating old photos",
    faqs: [
      {
        question: "How do I animate old photos with AI?",
        answer:
          "Sign in, upload a clear old portrait, and use your available daily quota to generate a watermarked 480p preview. Review the short animation before choosing an export.",
      },
      {
        question: "How can I bring old photos to life?",
        answer:
          "Restore a damaged source when needed, upload the clearest portrait, and generate subtle facial motion. Keeping the movement restrained helps bring old photos to life without overwhelming the original image.",
      },
      {
        question: "How can I make old photos move naturally?",
        answer:
          "Use a clear single-subject portrait with stable framing and visible facial details. Restrained movement usually makes old photos move more naturally than exaggerated effects.",
      },
      {
        question: "Can I use an old photo animation for a memorial?",
        answer:
          "Yes. A short, respectful animation can work well in a memorial or family-history video when it is clearly presented as AI-generated.",
      },
      {
        question: "Should I keep the original scan?",
        answer:
          "Always. The original scan is the archival source; animation, restoration, and colorization create separate derivative versions.",
      },
    ],
  },
};

export function getAnimationLandingPage(slug: AnimationLandingPageSlug) {
  return ANIMATION_LANDING_PAGES[slug];
}
