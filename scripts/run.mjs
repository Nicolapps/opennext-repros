// Builds and starts the copies of the repros one after the other, runs their `npm run check`, and compares the
// results with the documented ones (`<bug>/expected.json`):
//   next              must give the `next` results          → "expected"
//   opennext          must give the `opennext` results      → "bug reproduced"
//   opennext-patched  must give the `next` results          → "fixed"
//
//   node scripts/run.mjs                      all the repros, all the copies (`npm run all`)
//   node scripts/run.mjs <bug>                the three copies of a repro
//   node scripts/run.mjs <bug> <copy>         one copy
//
// The server listens on PORT (default: 3000), like with `npm start`.
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { BUGS, COPIES, readJson, ROOT } from "./lib.mjs";

const [bugArg, copyArg] = process.argv.slice(2);
if ((bugArg && !BUGS.includes(bugArg)) || (copyArg && !COPIES.includes(copyArg))) {
  console.error(`Usage: node scripts/run.mjs [${BUGS.join(" | ")}] [${COPIES.join(" | ")}]`);
  process.exit(2);
}

const port = process.env.PORT ?? "3000";
const env = { ...process.env, PORT: port, SERVER_URL: `http://localhost:${port}` };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isUp = () => fetch(env.SERVER_URL, { redirect: "manual" }).then(() => true, () => false);

/** `npm ci && npm run build && npm start`, then `npm run check`. Returns the results: `{ request: result }`. */
async function run(cwd) {
  if (await isUp()) throw new Error(`Something is already running on ${env.SERVER_URL}`);
  execSync("npm ci --no-audit --no-fund", { cwd, env, stdio: "inherit" });
  execSync("npm run build", { cwd, env, stdio: "inherit" });

  // In its own process group, to stop everything that `npm start` runs
  const server = spawn("npm", ["start"], { cwd, env, stdio: "inherit", detached: true });
  const exited = new Promise((resolve) => server.on("exit", resolve));
  try {
    for (let i = 0; !(await isUp()); i++) {
      if (i === 240 || server.exitCode !== null) throw new Error("The server did not start");
      await sleep(250);
    }
    await sleep(500); // for the helper, if any
    const rows = JSON.parse(execSync("node check.mjs --json", { cwd, env, encoding: "utf8" }));
    return Object.fromEntries(rows.map((row) => [row.request, row.result]));
  } finally {
    process.kill(-server.pid, "SIGTERM");
    await Promise.race([exited, sleep(5000).then(() => process.kill(-server.pid, "SIGKILL")).catch(() => {})]);
    while (await isUp()) await sleep(250);
  }
}

const VERDICTS = {
  next: { ok: "expected", ko: "DIFFERS from the documented results of Next.js" },
  opennext: { ok: "bug reproduced", ko: "bug NOT reproduced as documented" },
  "opennext-patched": { ok: "fixed", ko: "NOT fixed: differs from Next.js" },
};

const matrix = {};
let failed = false;
for (const bug of bugArg ? [bugArg] : BUGS) {
  const expected = readJson(path.join(ROOT, bug, "expected.json"));
  matrix[bug] = {};
  for (const copy of copyArg ? [copyArg] : COPIES) {
    console.log(`\n━━━ ${bug} / ${copy} ━━━`);
    const want = expected[copy === "opennext" ? "opennext" : "next"];
    let got;
    try {
      got = await run(path.join(ROOT, bug, copy));
    } catch (error) {
      got = { error: error.message };
    }
    const requests = [...new Set([...Object.keys(want), ...Object.keys(got)])];
    const ok = requests.every((request) => got[request] === want[request]);
    console.table(
      Object.fromEntries(
        requests.map((request) => [
          request,
          { result: got[request], ...(got[request] === want[request] ? {} : { "should be": want[request] }) },
        ]),
      ),
    );
    console.log(`${ok ? "✓" : "✗"} ${bug} / ${copy}: ${VERDICTS[copy][ok ? "ok" : "ko"]}`);
    matrix[bug][copy] = `${ok ? "✓" : "✗"} ${VERDICTS[copy][ok ? "ok" : "ko"]}`;
    failed ||= !ok;
  }
}

console.log("");
console.table(matrix);
process.exit(failed ? 1 : 0);
