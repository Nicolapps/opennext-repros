import type { NextConfig } from "next";

const config: NextConfig = {
  // The whole repro: with `trailingSlash: true`, Next.js redirects `/api/hello` to `/api/hello/` (308).
  trailingSlash: true,
};

export default config;
