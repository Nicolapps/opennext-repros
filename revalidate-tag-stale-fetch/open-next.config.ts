import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

// Runs the OpenNext server as a plain local Node server (https://opennext.js.org/aws/contribute/local_run).
export default {
  default: {
    override: {
      wrapper: "express-dev",
      converter: "node",
      incrementalCache: "fs-dev",
      queue: "direct",
      tagCache: "fs-dev-nextMode",
    },
  },
  imageOptimization: {
    override: { wrapper: "dummy", converter: "dummy" },
    loader: "fs-dev",
  },
} satisfies OpenNextConfig;
