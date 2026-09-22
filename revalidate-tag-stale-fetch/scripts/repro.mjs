// Builds the app for the three targets, starts the three servers, and prints the comparison.
//   next start → http://localhost:3000        OpenNext 4.1.5 (local Node server) → http://localhost:3001
//   OpenNext + fix (same, built with vendor/opennextjs-aws-4.1.5-*.tgz) → http://localhost:3003
//   counter.mjs (the data source of the cached fetch) → http://localhost:3002
import { execSync, spawn } from "node:child_process";
import { compare, status, TARGETS } from "../compare.mjs";

const NEXT_PORT = process.env.NEXT_PORT ?? "3000";
const OPENNEXT_PORT = process.env.OPENNEXT_PORT ?? "3001";
const OPENNEXT_FIXED_PORT = process.env.OPENNEXT_FIXED_PORT ?? "3003";
const run = (command) => execSync(command, { stdio: "inherit" });

if (process.versions.webcontainer || process.env.USE_PREBUILT) {
  // StackBlitz: neither build works there, so use the committed output of `npm run build:prebuilt`.
  console.log("Using the prebuilt output from prebuilt/ instead of building (see README).\n");
  run("node scripts/prebuilt.mjs unpack");
} else {
  run("npx open-next build"); // runs `npm run build` (next build), then bundles .next into .open-next
  run("node scripts/build-fixed.mjs"); // bundles the same .next with the fixed OpenNext into .open-next-fixed
}

const children = [
  spawn("node", ["counter.mjs"], { stdio: "inherit" }),
  spawn("npx", ["next", "start", "-p", NEXT_PORT], {
    env: { ...process.env, REPRO_TARGET: "next-start" },
    stdio: "inherit",
  }),
  spawn("node", ["index.mjs"], {
    cwd: ".open-next/server-functions/default",
    env: { ...process.env, PORT: OPENNEXT_PORT, REPRO_TARGET: "opennext" },
    stdio: "inherit",
  }),
  spawn("node", ["index.mjs"], {
    cwd: ".open-next-fixed/server-functions/default",
    env: { ...process.env, PORT: OPENNEXT_FIXED_PORT, REPRO_TARGET: "opennext-fixed" },
    stdio: "inherit",
  }),
];
const stop = () => children.forEach((child) => child.kill());
process.on("SIGINT", stop).on("SIGTERM", stop).on("exit", stop);

// Wait until the three servers answer.
for (const { origin } of TARGETS) {
  while (!(await fetch(`${origin}/ready`).catch(() => null))) await new Promise((resolve) => setTimeout(resolve, 250));
}

console.log("");
console.table(
  (await compare()).map((row) => ({
    request: row.path,
    [TARGETS[0].name]: row.answers[0],
    [TARGETS[1].name]: row.answers[1],
    [TARGETS[2].name]: row.answers[2],
    "": status(row),
  })),
);
console.log(`\nSame comparison as a page: ${TARGETS[0].origin}/ (Ctrl+C to stop)`);
