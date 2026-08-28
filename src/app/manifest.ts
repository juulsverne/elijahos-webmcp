import type { MetadataRoute } from "next";
import { ELIJAH } from "@/lib/elijah";
import { THEME_COLORS } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ELIJAH.osName,
    short_name: ELIJAH.osName,
    description: ELIJAH.metadataDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLORS.bgDeep,
    theme_color: THEME_COLORS.bgDeep,
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
