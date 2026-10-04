// `npm run check`: reads a cached `fetch`, revalidates its tag, and reads it again. Takes about 2 seconds.
// The server of this folder must be running (`npm start`). Its URL is read from SERVER_URL.
const origin = process.env.SERVER_URL ?? "http://localhost:3000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A new tag and cache entry for every run
const id = Math.random().toString(36).slice(2, 8);
const steps = [
  { path: "/data", note: "not cached yet" },
  { path: "/data", note: "cached" },
  { path: "/revalidate", note: 'revalidateTag(tag, "max")' },
  { path: "/data", note: "stale, refreshed in the background" },
  { path: "/data", note: "1s later", wait: 1000 },
  { path: "/data", note: "2s later", wait: 1000 },
];

const rows = [];
for (const step of steps) {
  if (step.wait) await sleep(step.wait);
  const res = await fetch(`${origin}${step.path}/${id}`);
  rows.push({ request: `GET ${step.path}/<id> (${step.note})`, result: `${res.status} ${await res.text()}` });
}

// Prints the results as a table, or as JSON with `--json` (used by scripts/run.mjs at the root of the repository).
if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
else console.table(Object.fromEntries(rows.map((row) => [row.request, { result: row.result }])));
