import type { MetadataRoute } from "next";

/**
 * Web App Manifest (served at /manifest.webmanifest). Enables installing
 * "Spelling Bee" to the home screen as a standalone app. Colors match the
 * cream-and-yellow bee icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spelling Bee",
    short_name: "Spelling Bee",
    description: "뜻을 보고 영어 단어와 스펠링을 연습하는 어린이용 학습 앱",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDF7E7",
    theme_color: "#FDE68A",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
