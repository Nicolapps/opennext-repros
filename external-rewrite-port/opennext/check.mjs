// `npm run check`: sends the requests of this repro, and reports the status and body.
// The server of this folder must be running (`npm start`). Its URL is read from SERVER_URL.
const origin = process.env.SERVER_URL ?? "http://localhost:3000";

const paths = ["/proxy/some/path", "/proxy-fixed"];

const rows = [];
for (const path of paths) {
  const res = await fetch(origin + path, { redirect: "manual" });
  const body = (await res.text()).trim();
  rows.push({ request: `GET ${path}`, result: `${res.status} ${body.length > 60 ? `${body.slice(0, 60)}…` : body}` });
}

// Prints the results as a table, or as JSON with `--json` (used by scripts/run.mjs at the root of the repository).
if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
else console.table(Object.fromEntries(rows.map((row) => [row.request, { result: row.result }])));
