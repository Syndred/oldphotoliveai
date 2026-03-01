export type ShowcaseSampleAsset = {
  id: string;
  beforeKey: string;
  restoredKey: string;
  colorizedKey: string;
  animationKey: string;
};

// Centralized sample assets from R2.
// Update keys here when you want to replace homepage examples.
export const SHOWCASE_SAMPLE_ASSETS: ShowcaseSampleAsset[] = [
  {
    id: "01",
    beforeKey: "example/01-before.jpg",
    restoredKey: "example/01-restored.jpg",
    colorizedKey: "example/01-colorized.jpg",
    animationKey: "example/01-animation.mp4",
  },
  {
    id: "02",
    beforeKey: "example/02-before.webp",
    restoredKey: "example/02-restored.jpg",
    colorizedKey: "example/02-colorized.jpg",
    animationKey: "example/02-animation.mp4",
  },
  {
    id: "03",
    beforeKey: "example/03-before.webp",
    restoredKey: "example/03-restored.jpg",
    colorizedKey: "example/03-colorized.jpg",
    animationKey: "example/03-animation.mp4",
  },
  {
    id: "04",
    beforeKey: "example/04-before.jpg",
    restoredKey: "example/04-restored.jpg",
    colorizedKey: "example/04-colorized.jpg",
    animationKey: "example/04-animation.mp4",
  },
  {
    id: "05",
    beforeKey: "example/05-before.jfif",
    restoredKey: "example/05-restored.jpg",
    colorizedKey: "example/05-colorized.jpg",
    animationKey: "example/05-animation.mp4",
  },
];
