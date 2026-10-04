import type { NextConfig } from "next";

const config: NextConfig = {
  // The whole repro: `has` / `missing` conditions on a query key, without a `value`.
  async redirects() {
    return [
      // Should only apply when the `preview` query key is present
      { source: "/has", has: [{ type: "query", key: "preview" }], destination: "/matched", permanent: false },
      // Should only apply when the `preview` query key is absent
      { source: "/missing", missing: [{ type: "query", key: "preview" }], destination: "/matched", permanent: false },
    ];
  },
};

export default config;
