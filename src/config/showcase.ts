import { buildCdnUrl } from "@/lib/url";

export type CompareShowcaseItem = {
  id: string;
  beforeKey: string;
  afterKey: string;
  // Useful when multiple examples temporarily reuse the same source file.
  // Keeps browser cache keys distinct so carousel switching is visible.
  version?: number;
};

export type CompareShowcaseRow = {
  id: "restoration" | "colorization";
  titleKey: "categories.restoration.title" | "categories.colorization.title";
  subtitleKey:
    | "categories.restoration.subtitle"
    | "categories.colorization.subtitle";
  items: CompareShowcaseItem[];
};

export type VideoShowcaseItem = {
  id: string;
  videoKey: string;
  version?: number;
};

export const SHOWCASE_IMAGE_AUTO_ROTATE_MS = 5000;
export const SHOWCASE_VIDEO_AUTO_ROTATE_MS = 6000;

// Configure image examples here.
// Later you can replace keys with real files, e.g.:
// beforeKey: "showcase/restoration/before-01.jpg"
// afterKey: "showcase/restoration/after-01.jpg"
export const IMAGE_SHOWCASE_ROWS: CompareShowcaseRow[] = [
  {
    id: "restoration",
    titleKey: "categories.restoration.title",
    subtitleKey: "categories.restoration.subtitle",
    items: Array.from({ length: 5 }, (_, i) => ({
      id: `restoration-${i + 1}`,
      beforeKey: "showcase/original.jpg",
      afterKey: "showcase/restored.jpg",
      version: i + 1,
    })),
  },
  {
    id: "colorization",
    titleKey: "categories.colorization.title",
    subtitleKey: "categories.colorization.subtitle",
    items: Array.from({ length: 5 }, (_, i) => ({
      id: `colorization-${i + 1}`,
      beforeKey: "showcase/original.jpg",
      afterKey: "showcase/colorized.jpg",
      version: i + 1,
    })),
  },
];

// Configure video examples here.
// Later you can replace each videoKey with different demo videos.
export const VIDEO_SHOWCASE_ITEMS: VideoShowcaseItem[] = Array.from(
  { length: 5 },
  (_, i) => ({
    id: `animation-${i + 1}`,
    videoKey: "showcase/animation.mp4",
    version: i + 1,
  })
);

export function resolveShowcaseAssetUrl(key: string, version?: number): string {
  const baseUrl = buildCdnUrl(key);
  return typeof version === "number" ? `${baseUrl}?v=${version}` : baseUrl;
}
