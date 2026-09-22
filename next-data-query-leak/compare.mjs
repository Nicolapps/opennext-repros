// The comparison itself: send the same requests to the three servers, and report the `query` seen by `getServerSideProps`.
// Used by the page (app/page.tsx) and by the terminal output of `npm run repro`.

export const TARGETS = [
  { name: "next start", origin: `http://localhost:${process.env.NEXT_PORT ?? 3000}` },
  { name: "OpenNext 4.1.5", origin: `http://localhost:${process.env.OPENNEXT_PORT ?? 3001}` },
  { name: "OpenNext + fix", origin: `http://localhost:${process.env.OPENNEXT_FIXED_PORT ?? 3003}` },
];

// `/ssr?foo=bar` as a document request, then as the data request made by `next/link` and `next/router`.
export const PATHS = ["/ssr?foo=bar", "/_next/data/<buildId>/ssr.json?foo=bar"];

async function probe(origin, path) {
  try {
    // The page embeds its props and the build id as JSON in <script id="__NEXT_DATA__">
    const html = await (await fetch(`${origin}/ssr?foo=bar`, { cache: "no-store" })).text();
    const nextData = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/)[1]);
    if (!path.startsWith("/_next/data/")) return `query = ${JSON.stringify(nextData.props.pageProps.query)}`;

    const res = await fetch(origin + path.replace("<buildId>", nextData.buildId), { cache: "no-store" });
    return `query = ${JSON.stringify((await res.json()).pageProps.query)}`;
  } catch (error) {
    return `error: ${error.cause?.code ?? error.message}`;
  }
}

/** Compares the answers to the one of `next start`: `{ differs }` for OpenNext 4.1.5, `{ fixed }` for OpenNext + fix. */
export function verdict([expected, actual, withFix]) {
  return { differs: actual !== expected, fixed: withFix === expected };
}

/** Describes a row: "same", or which of the OpenNext answers differ from the one of `next start`. */
export function status({ differs, fixed }) {
  if (differs) return fixed ? "≠ 4.1.5 differs, fix matches" : "≠ 4.1.5 differs, fix differs";
  return fixed ? "same" : "≠ fix differs";
}

/** Returns one row per path: `{ path, answers: [nextStart, openNext, openNextFixed], differs, fixed }`. */
export async function compare() {
  return Promise.all(
    PATHS.map(async (path) => {
      const answers = await Promise.all(TARGETS.map((target) => probe(target.origin, path)));
      return { path, answers, ...verdict(answers) };
    }),
  );
}
