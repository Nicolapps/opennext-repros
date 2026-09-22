import config from "./open-next.config";

// The configuration of the build with the fixed OpenNext (scripts/build-fixed.mjs): the same as open-next.config.ts,
// except that `next build` is not run again. The `.next/` of the previous `open-next build` is reused, so that
// `next start`, OpenNext 4.1.5 and OpenNext + fix all run the same Next.js build (same BUILD_ID).
export default {
  ...config,
  buildCommand: 'node -e "console.log(\'Reusing .next/ from the previous build\')"',
};
