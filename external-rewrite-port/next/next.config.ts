import type { NextConfig } from "next";

// `upstream.mjs`, which `npm start` runs next to the server
const upstream = `http://localhost:${process.env.UPSTREAM_PORT ?? 3002}`;

const config: NextConfig = {
  // The whole repro: external rewrites to a destination with a port.
  async rewrites() {
    return [
      { source: "/proxy/:path*", destination: `${upstream}/:path*` },
      // Control: same destination host, but no params
      { source: "/proxy-fixed", destination: `${upstream}/fixed` },
    ];
  },
};

export default config;
