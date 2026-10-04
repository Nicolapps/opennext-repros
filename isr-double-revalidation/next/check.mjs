// `npm run check`: requests ISR pages (revalidate = 2s), and counts how often they are rendered. Takes about 12 seconds.
// The server of this folder must be running (`npm start`). Its URL is read from SERVER_URL.
const origin = process.env.SERVER_URL ?? "http://localhost:3000";
// The renders are counted by counter.mjs, which `npm start` runs next to the server.
const counter = `http://localhost:${process.env.COUNTER_PORT ?? 3002}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Requests `path`, waits for a possible background regeneration, and returns how many renders happened. */
async function rendersFor(path) {
  const count = async () => Number(await (await fetch(`${counter}/count?key=${path}`)).text());
  const before = await count();
  const res = await fetch(origin + path);
  await res.text();
  await sleep(3000);
  const renders = (await count()) - before;
  return `${res.status}, ${renders} render${renders === 1 ? "" : "s"}`;
}

// New pages for every run
const id = Math.random().toString(36).slice(2, 8);
const rows = [];
for (const page of ["/pages-isr", "/isr"]) {
  for (const step of ["1st request: not cached yet", "3s later: stale, regenerated in the background"]) {
    rows.push({ request: `GET ${page}/<id> (${step})`, result: await rendersFor(`${page}/${id}`) });
  }
}

// Prints the results as a table, or as JSON with `--json` (used by scripts/run.mjs at the root of the repository).
if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
else console.table(Object.fromEntries(rows.map((row) => [row.request, { result: row.result }])));
