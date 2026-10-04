// `npm run check`: requests a page and its data route, and reports the `query` seen by `getServerSideProps`.
// The server of this folder must be running (`npm start`). Its URL is read from SERVER_URL.
const origin = process.env.SERVER_URL ?? "http://localhost:3000";

// The document request. The page embeds its props and the build id as JSON in <script id="__NEXT_DATA__">
const html = await (await fetch(`${origin}/ssr?foo=bar`)).text();
const nextData = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/)[1]);

// The data request made by `next/link` and `next/router` for the same page
const data = await (await fetch(`${origin}/_next/data/${nextData.buildId}/ssr.json?foo=bar`)).json();

const rows = [
  { request: "GET /ssr?foo=bar", result: `query = ${JSON.stringify(nextData.props.pageProps.query)}` },
  { request: "GET /_next/data/<buildId>/ssr.json?foo=bar", result: `query = ${JSON.stringify(data.pageProps.query)}` },
];

// Prints the results as a table, or as JSON with `--json` (used by scripts/run.mjs at the root of the repository).
if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
else console.table(Object.fromEntries(rows.map((row) => [row.request, { result: row.result }])));
