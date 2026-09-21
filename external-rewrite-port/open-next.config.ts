import { ReadableStream } from "node:stream/web";
import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

// Runs the OpenNext server as a plain local Node server (https://opennext.js.org/aws/contribute/local_run).
export default {
  default: {
    override: {
      wrapper: "express-dev",
      converter: "node",
      incrementalCache: "fs-dev",
      queue: "direct",
      tagCache: "fs-dev",
      // How rewrites to another origin are fetched. The default ("node") only supports https destinations, and the
      // upstream server of this repro uses http. Not related to the bug: it fails before this is called.
      proxyExternalRequest: async () => ({
        name: "plain-fetch",
        proxy: async (event) => {
          const response = await fetch(event.url, { method: event.method });
          return {
            type: "core",
            statusCode: response.status,
            headers: Object.fromEntries(response.headers),
            isBase64Encoded: false,
            body: ReadableStream.from([Buffer.from(await response.arrayBuffer())]),
          };
        },
      }),
    },
  },
  imageOptimization: {
    override: { wrapper: "dummy", converter: "dummy" },
    loader: "fs-dev",
  },
} satisfies OpenNextConfig;
