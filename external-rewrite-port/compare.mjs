// The comparison itself: send the same requests to the three servers, and report the status and body.
// Used by the page (app/page.tsx) and by the terminal output of `npm run repro`.

export const TARGETS = [
  { name: "next start", origin: `http://localhost:${process.env.NEXT_PORT ?? 3000}` },
  { name: "OpenNext 4.1.5", origin: `http://localhost:${process.env.OPENNEXT_PORT ?? 3001}` },
  { name: "OpenNext + fix", origin: `http://localhost:${process.env.OPENNEXT_FIXED_PORT ?? 3003}` },
];

export const PATHS = ["/proxy/some/path", "/proxy-fixed"];

async function probe(origin, path) {
  try {
    const res = await fetch(origin + path, { redirect: "manual", cache: "no-store" });
    const body = (await res.text()).trim();
    return `${res.status} ${body.length > 60 ? `${body.slice(0, 60)}…` : body}`;
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
