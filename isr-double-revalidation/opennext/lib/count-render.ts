import http from "node:http";

/** Tells `counter.mjs` that `path` was rendered. (Not done with `fetch`, to stay clear of the fetch cache of Next.js.) */
export function countRender(path: string) {
  const url = `http://localhost:${process.env.COUNTER_PORT ?? 3002}/render?key=${encodeURIComponent(path)}`;
  return new Promise<void>((resolve) => {
    http.get(url, (res) => res.resume().on("end", resolve)).on("error", () => resolve()); // the counter does not run during the build
  });
}
