// The comparison itself: send the same requests to both servers, and report the status and body.
// Used by the page (app/page.tsx) and by the terminal output of `npm run repro`.

export const TARGETS = [
  { name: "next start", origin: `http://localhost:${process.env.NEXT_PORT ?? 3000}` },
  { name: "OpenNext", origin: `http://localhost:${process.env.OPENNEXT_PORT ?? 3001}` },
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

/** Returns one row per path: `{ path, answers: [nextStart, openNext], differs }`. */
export async function compare() {
  return Promise.all(
    PATHS.map(async (path) => {
      const answers = await Promise.all(TARGETS.map((target) => probe(target.origin, path)));
      return { path, answers, differs: new Set(answers).size > 1 };
    }),
  );
}
