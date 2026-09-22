// The comparison itself: on the three servers, read a cached `fetch`, revalidate its tag, and read it again.
// Used by the page (app/page.tsx) and by the terminal output of `npm run repro`.

export const TARGETS = [
  { name: "next start", origin: `http://localhost:${process.env.NEXT_PORT ?? 3000}` },
  { name: "OpenNext 4.1.5", origin: `http://localhost:${process.env.OPENNEXT_PORT ?? 3001}` },
  { name: "OpenNext + fix", origin: `http://localhost:${process.env.OPENNEXT_FIXED_PORT ?? 3003}` },
];

// In a page render, React answers identical `fetch` calls from memory, unless they have a `signal`
const noMemo = () => ({ cache: "no-store", signal: AbortSignal.timeout(10_000) });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(origin, path) {
  try {
    const res = await fetch(origin + path, noMemo());
    return `${res.status} ${await res.text()}`;
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

/** Returns one row per step: `{ path, answers: [nextStart, openNext, openNextFixed], differs, fixed }`. Takes about 3 seconds. */
export async function compare() {
  // A new tag and cache entry for every run, so that concurrent runs do not interfere
  const id = Math.random().toString(36).slice(2, 8);
  const steps = [
    { path: `/data/${id}`, note: "not cached yet" },
    { path: `/data/${id}`, note: "cached" },
    { path: `/revalidate/${id}`, note: `revalidateTag("data-${id}", "max")` },
    { path: `/data/${id}`, note: "stale, refreshed in the background" },
    { path: `/data/${id}`, note: "1s later", wait: 1000 },
    { path: `/data/${id}`, note: "2s later", wait: 1000 },
  ];
  const rows = [];
  for (const step of steps) {
    if (step.wait) await sleep(step.wait);
    const answers = await Promise.all(TARGETS.map((target) => get(target.origin, step.path)));
    rows.push({ path: `GET ${step.path} (${step.note})`, answers, ...verdict(answers) });
  }
  return rows;
}
