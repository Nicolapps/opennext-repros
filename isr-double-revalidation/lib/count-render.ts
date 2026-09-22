import http from "node:http";

/** Tells `counter.mjs` that `path` was rendered. (Not done with `fetch`, to stay clear of the fetch cache of Next.js.) */
export function countRender(path: string) {
  // REPRO_TARGET is set by scripts/repro.mjs: "next-start", "opennext" or "opennext-fixed"
  const key = encodeURIComponent(`${process.env.REPRO_TARGET}:${path}`);
  return new Promise<void>((resolve) => {
    http.get(`http://localhost:3002/render?key=${key}`, (res) => res.resume().on("end", resolve))
      .on("error", () => resolve()); // the counter does not run during the build
  });
}
