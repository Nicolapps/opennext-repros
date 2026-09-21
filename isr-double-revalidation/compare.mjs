// The comparison itself: request ISR pages (revalidate = 2s) on both servers, and count how often they are rendered.
// Used by the page (app/page.tsx) and by the terminal output of `npm run repro`.

export const TARGETS = [
  { name: "next start", key: "next-start", origin: `http://localhost:${process.env.NEXT_PORT ?? 3000}` },
  { name: "OpenNext", key: "opennext", origin: `http://localhost:${process.env.OPENNEXT_PORT ?? 3001}` },
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

/** The two steps for one page. Returns rows: `{ path, answers: [nextStart, openNext], differs }`. */
async function scenario(path) {
  const rows = [];
  for (const step of ["1st request: not cached yet", "3s later: stale, regenerated in the background"]) {
    const answers = await Promise.all(TARGETS.map((target) => rendersFor(target, path)));
    rows.push({ path: `GET ${path} (${step})`, answers, differs: new Set(answers).size > 1 });
  }
  return rows;
}

/** Takes about 6 seconds. */
export async function compare() {
  // New pages for every run, so that concurrent runs do not interfere
  const id = Math.random().toString(36).slice(2, 8);
  return (await Promise.all([scenario(`/pages-isr/${id}`), scenario(`/isr/${id}`)])).flat();
}
