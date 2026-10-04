// `npm run check`: sends the requests of this repro, without following redirects.
// The server of this folder must be running (`npm start`). Its URL is read from SERVER_URL.
const origin = process.env.SERVER_URL ?? "http://localhost:3000";

const paths = ["/has", "/has?preview=1", "/missing", "/missing?preview=1"];

const rows = [];
for (const path of paths) {
  const res = await fetch(origin + path, { redirect: "manual" });
  const location = res.headers.get("location");
  rows.push({ request: `GET ${path}`, result: location ? `${res.status} → ${location}` : `${res.status}` });
}

// Prints the results as a table, or as JSON with `--json` (used by scripts/run.mjs at the root of the repository).
if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
else console.table(Object.fromEntries(rows.map((row) => [row.request, { result: row.result }])));
