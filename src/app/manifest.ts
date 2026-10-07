import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Libaas store",
    short_name: "Libaas",
    start_url: "/",
    display: "browser",
    background_color: "#f4eee2",
    theme_color: "#f4eee2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
