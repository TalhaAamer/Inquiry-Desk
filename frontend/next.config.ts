// next.config.ts - settings for the Next.js app.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These two lines came with the generated project. Keep them.
  cacheComponents: true,
  partialPrefetching: true,

  // IMPORTANT: this block switches Tailwind on for every .css file.
  // Without it the page has no styling at all.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // The page runs on port 3000, the Python server on port 8000.
  // This rule forwards every request that starts with /api/ to Python,
  // so the browser only ever talks to one address (no CORS errors).
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" },
    ];
  },
};

export default nextConfig;