import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The book screens are pure client-rendered pages, so they live at the
  // *static* /book/* routes (CDN-served, no serverless function). Keep the
  // public /books/:id/... URLs by rewriting them onto those static routes; the
  // book id is read from the (unchanged) browser path via usePathname.
  async rewrites() {
    return [
      { source: "/books/:id", destination: "/book" },
      { source: "/books/:id/words", destination: "/book/words" },
      { source: "/books/:id/master", destination: "/book/master" },
      { source: "/books/:id/test", destination: "/book/test" },
    ];
  },
};

export default nextConfig;
