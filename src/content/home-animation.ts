export const HOME_METADATA = {
  title: "Animate Old Photos with AI — Restore, Colorize & Bring Old Photos to Life Online Free",
  description: "Restore, colorize, and animate your old family photos with AI. Upload a vintage photo and watch it come to life in seconds. Free preview.",
  path: "/",
} as const;

export const HOME_PIPELINE_STEPS = [
  { title: "Restore", href: "/restore-old-photos", description: "Remove scratches, noise, folds, and blur from old and damaged photos. Our AI cleanup prepares your image for the next steps." },
  { title: "Colorize", href: "/colorize-old-photos", description: "Add natural, realistic color to black and white photos. The AI uses patterns learned from millions of photographs to infer plausible colors." },
  { title: "Animate", href: "/animate", description: "Bring faces to life with subtle, natural motion — a gentle smile, a blink, or a turn of the head. Respectful, not cartoonish." },
] as const;

export const HOME_USE_CASES = [
  ["Family archives", "Bring decades of black and white family photographs back to life."],
  ["Genealogy research", "See ancestors as they might have looked and moved."],
  ["Memorial photos", "Honor loved ones with a respectful, living portrait."],
  ["Historical collections", "Make archival photographs emotionally immediate for modern audiences."],
  ["Damaged & faded prints", "Restore, colorize, and animate even worn-out old photos."],
  ["Film negatives & slides", "Digitize and bring scanned negatives and slides to life."],
] as const;

export const HOME_ANIMATION_FAQS = [
  { question: "What does 'bring old photos to life' actually mean?", answer: "It means taking a still old photograph and using AI to add subtle, natural motion — like a gentle smile, a blink, or a slight turn of the head. The result is a short video that makes the person in the photo feel present again. It is designed to be respectful and realistic, not cartoonish." },
  { question: "Can I animate any old photo?", answer: "Best results come from clear, front-facing portraits where the person's face is visible and well lit. Group photos, profile shots, and vintage portraits can also work, but severely damaged, extremely blurry, or side-profile photos may produce less natural results." },
  { question: "Do I need to restore or colorize the photo first?", answer: "No. You can use animation on its own. For worn or black-and-white portraits, the full restore, colorize, and animate pipeline can provide a cleaner base and a more complete result. Each workflow is also available independently when you only need one step." },
  { question: "Is the animation realistic or does it look like a cartoon?", answer: "The goal is realistic, restrained facial motion: subtle expressions, gentle head movement, and natural eye blinks. AI output can still vary with the source photo, so preview the result before using it in a family, memorial, or historical project." },
  { question: "How long does it take to animate a photo?", answer: "Most jobs finish within a few minutes. Processing time varies with image quality, the workflow you select, provider capacity, and current queue demand. The result page shows progress while restoration, colorization, and animation run." },
  { question: "What file formats can I upload?", answer: "JPG, PNG, and WebP files up to 10 MB are supported. For the best results, use the clearest available scan with good contrast and visible facial features, and avoid screenshots or photos with strong glare when an original scan is available." },
  { question: "Can I use the animated result commercially?", answer: "You may use outputs for personal or commercial projects when you have the necessary rights to the source photo and your use complies with our Terms. You remain responsible for permissions, publicity rights, and any disclosure requirements that apply to AI-generated media." },
  { question: "Is my photo kept private?", answer: "Photos are transferred securely and processed by the providers needed to run the service. Uploaded and generated media can remain available in your task history until you delete it or it is removed under our retention practices. We do not publish your family photos as public examples without permission. See the Privacy Policy for details." },
  { question: "How is this different from other photo animation tools?", answer: "OldPhotoLive AI combines restoration, colorization, and animation in one workflow. The focus is on subtle, respectful results for family memories rather than exaggerated effects, while still letting you use restoration, colorization, or animation independently." },
  { question: "Is there a free version?", answer: "Yes. A first-time visitor can create one lower-resolution, watermarked animation preview without signing up. Account quotas and paid credits are available for additional processing, higher-quality exports, and watermark-free downloads. See the pricing page for current details." },
] as const;

export const HOME_HOW_IT_WORKS = { title: "One Photo, Three Steps to a Living Memory", subtitle: "Each step works independently or as a complete pipeline. Start anywhere.", steps: HOME_PIPELINE_STEPS } as const;

export const ANIMATE_HOW_IT_WORKS = {
  title: "How to Animate an Old Photo",
  subtitle: "Create subtle motion from a clear portrait in three steps.",
  steps: [
    { title: "Upload your photo", description: "Drag and drop a clear old portrait. Best results come from front-facing photos with visible facial features." },
    { title: "AI creates motion", description: "Our model analyzes the face and adds subtle, natural movement — a blink, a gentle smile, or a slight head turn." },
    { title: "Preview and download", description: "Watch the animation preview, then download the available video quality when you are happy with the result." },
  ],
} as const;

export const BRING_TO_LIFE_HOW_IT_WORKS = {
  title: "How to Bring an Old Photo to Life",
  subtitle: "Turn one meaningful portrait into a short living memory.",
  steps: [
    { title: "Choose your photo", description: "Pick a meaningful old portrait — a grandparent, a wedding photo, or a childhood memory. Front-facing portraits work best." },
    { title: "AI brings it to life", description: "Our model reconstructs natural facial motion from a single image to create a respectful, understated short video." },
    { title: "Share the memory", description: "Download the video and share it with family, or use it in a memorial or family-history presentation." },
  ],
} as const;

export const RESTORE_HOW_IT_WORKS = {
  title: "How to Restore an Old Photo",
  subtitle: "Clean up a damaged print while preserving the original memory.",
  steps: [
    { title: "Upload a damaged photo", description: "Drag and drop a scanned or photographed old print. JPG, PNG, and WebP are supported." },
    { title: "AI removes damage", description: "The model reduces scratches, dust, noise, folds, tears, and blur while reconstructing surrounding detail." },
    { title: "Compare and download", description: "Review the restored result beside the original and download the available full-quality image." },
  ],
} as const;
