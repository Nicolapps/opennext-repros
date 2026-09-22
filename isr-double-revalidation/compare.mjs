// The comparison itself: request ISR pages (revalidate = 2s) on the three servers, and count how often they are rendered.
// Used by the page (app/page.tsx) and by the terminal output of `npm run repro`.

export const TARGETS = [
  { name: "next start", key: "next-start", origin: `http://localhost:${process.env.NEXT_PORT ?? 3000}` },
  { name: "OpenNext 4.1.5", key: "opennext", origin: `http://localhost:${process.env.OPENNEXT_PORT ?? 3001}` },
  { name: "OpenNext + fix", key: "opennext-fixed", origin: `http://localhost:${process.env.OPENNEXT_FIXED_PORT ?? 3003}` },
];

const COUNTER = "http://localhost:3002";
// In a page render, React answers identical `fetch` calls from memory, unless they have a `signal`
const noMemo = () => ({ cache: "no-store", signal: AbortSignal.timeout(10_000) });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Requests `path`, waits for a possible background regeneration, and returns how many renders happened. */
async function rendersFor(target, path) {
  const count = async () => Number(await (await fetch(`${COUNTER}/count?key=${target.key}:${path}`, noMemo())).text());
  try {
    const before = await count();
    const res = await fetch(target.origin + path, noMemo());
    await res.text();
    await sleep(3000);
    const renders = (await count()) - before;
    return `${res.status}, ${renders} render${renders === 1 ? "" : "s"}`;
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

/** The two steps for one page. Returns rows: `{ path, answers: [nextStart, openNext, openNextFixed], differs, fixed }`. */
async function scenario(path) {
  const rows = [];
  for (const step of ["1st request: not cached yet", "3s later: stale, regenerated in the background"]) {
    const answers = await Promise.all(TARGETS.map((target) => rendersFor(target, path)));
    rows.push({ path: `GET ${path} (${step})`, answers, ...verdict(answers) });
  }
  return rows;
}

/** Takes about 6 seconds. */
export async function compare() {
  // New pages for every run, so that concurrent runs do not interfere
  const id = Math.random().toString(36).slice(2, 8);
  return (await Promise.all([scenario(`/pages-isr/${id}`), scenario(`/isr/${id}`)])).flat();
}
