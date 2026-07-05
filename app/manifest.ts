import type { MetadataRoute } from "next";
import { BRAND, SHORT_DESCRIPTION } from "@/lib/seo";

/**
 * Web app manifest, generated at /manifest.webmanifest.
 *
 * Makes the site installable (PWA), gives Android/Chrome a name + icons,
 * and is a minor but real signal of a polished, app-grade site.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} — AI PPT Maker`,
    short_name: BRAND,
    description: SHORT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["productivity", "business", "utilities"],
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
    ],
  };
}
