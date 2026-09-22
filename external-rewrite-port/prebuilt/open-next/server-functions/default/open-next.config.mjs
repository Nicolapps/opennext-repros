import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);import bannerUrl from 'url';const __dirname = bannerUrl.fileURLToPath(new URL('.', import.meta.url));

// open-next.config.ts
import { ReadableStream } from "node:stream/web";
var open_next_config_default = {
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
            body: ReadableStream.from([Buffer.from(await response.arrayBuffer())])
          };
        }
      })
    }
  },
  imageOptimization: {
    override: { wrapper: "dummy", converter: "dummy" },
    loader: "fs-dev"
  }
};
export {
  open_next_config_default as default
};
