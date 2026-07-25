import type { MetadataRoute } from "next";
import { BRAND_NAME, BRAND_ICON, SITE_DESCRIPTION } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: "OldPhotoLive",
    description: SITE_DESCRIPTION,
    start_url: "/en",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#111827",
    icons: [
      {
        src: BRAND_ICON,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
