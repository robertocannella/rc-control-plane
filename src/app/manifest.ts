import type { MetadataRoute } from "next";

// display: "standalone" is the actual point of this file — it's what
// gets rid of the browser chrome once installed, matching the "looks way
// better in [standalone] mode" observation that prompted adding this.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Control Plane",
    short_name: "Control Plane",
    description: "Roberto Cannella's personal control plane",
    start_url: "/",
    display: "standalone",
    // Matches the icon set's dark-blue background — the anchor brand
    // color for the status bar/splash screen.
    background_color: "#16324F",
    theme_color: "#16324F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
