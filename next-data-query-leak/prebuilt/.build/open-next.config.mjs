import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);import bannerUrl from 'url';const __dirname = bannerUrl.fileURLToPath(new URL('.', import.meta.url));

// open-next.config.ts
var open_next_config_default = {
  default: {
    override: {
      wrapper: "express-dev",
      converter: "node",
      incrementalCache: "fs-dev",
      queue: "direct",
      tagCache: "fs-dev"
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
