import { buildCdnUrl } from "@/lib/url";
import { SHOWCASE_SAMPLE_ASSETS } from "@/config/showcase-assets";

export type CompareShowcaseItem = {
  id: string;
  beforeKey: string;
  afterKey: string;
  // Useful when multiple examples temporarily reuse the same source file.
  // Keeps browser cache keys distinct when showcase samples reuse the same files.
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

// Configure image examples here.
// Later you can replace keys with real files, e.g.:
// beforeKey: "showcase/restoration/before-01.jpg"
// afterKey: "showcase/restoration/after-01.jpg"
export const IMAGE_SHOWCASE_ROWS: CompareShowcaseRow[] = [
  {
    id: "restoration",
    titleKey: "categories.restoration.title",
    subtitleKey: "categories.restoration.subtitle",
    items: SHOWCASE_SAMPLE_ASSETS.map((sample, index) => ({
      id: `restoration-${index + 1}`,
      beforeKey: sample.beforeKey,
      afterKey: sample.restoredKey,
    })),
  },
  {
    id: "colorization",
    titleKey: "categories.colorization.title",
    subtitleKey: "categories.colorization.subtitle",
    items: SHOWCASE_SAMPLE_ASSETS.map((sample, index) => ({
      id: `colorization-${index + 1}`,
      beforeKey: sample.beforeKey,
      afterKey: sample.colorizedKey,
    })),
  },
];

// Configure video examples here.
// Later you can replace each videoKey with different demo videos.
export const VIDEO_SHOWCASE_ITEMS: VideoShowcaseItem[] = [
  ...SHOWCASE_SAMPLE_ASSETS.map((sample, index) => ({
    id: `animation-${index + 1}`,
    videoKey: sample.animationKey,
  })),
];

export function resolveShowcaseAssetUrl(key: string, version?: number): string {
  const baseUrl = buildCdnUrl(key);
  return typeof version === "number" ? `${baseUrl}?v=${version}` : baseUrl;
}
