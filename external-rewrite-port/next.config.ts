import type { NextConfig } from "next";

const config: NextConfig = {
  // The whole repro: external rewrites to a destination with a port (http://localhost:3002 is `upstream.mjs`).
  async rewrites() {
    return [
      { source: "/proxy/:path*", destination: "http://localhost:3002/:path*" },
      // Control: same destination host, but no params
      { source: "/proxy-fixed", destination: "http://localhost:3002/fixed" },
    ];
  },
};

export default config;
