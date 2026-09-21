// Builds the app once for each target, starts both servers, and prints the comparison.
//   next start → http://localhost:3000        OpenNext (local Node server) → http://localhost:3001
import { execSync, spawn } from "node:child_process";
import { compare, TARGETS } from "../compare.mjs";

const NEXT_PORT = process.env.NEXT_PORT ?? "3000";
const OPENNEXT_PORT = process.env.OPENNEXT_PORT ?? "3001";
const run = (command) => execSync(command, { stdio: "inherit" });

if (process.versions.webcontainer || process.env.USE_PREBUILT) {
  // StackBlitz: the OpenNext build needs native binaries, so use the committed output of `npm run build:prebuilt`.
  console.log("Using the prebuilt OpenNext output from prebuilt/ instead of building it (see README).\n");
  run("npm run build");
  run("node scripts/prebuilt.mjs unpack");
} else {
  run("npx open-next build"); // runs `npm run build` (next build), then bundles .next into .open-next
}

const children = [
  spawn("npx", ["next", "start", "-p", NEXT_PORT], { stdio: "inherit" }),
  spawn("node", ["index.mjs"], {
    cwd: ".open-next/server-functions/default",
    env: { ...process.env, PORT: OPENNEXT_PORT },
    stdio: "inherit",
  }),
];
const stop = () => children.forEach((child) => child.kill());
process.on("SIGINT", stop).on("SIGTERM", stop).on("exit", stop);

// Wait until both servers answer.
for (const { origin } of TARGETS) {
  while (!(await fetch(origin).catch(() => null))) await new Promise((resolve) => setTimeout(resolve, 250));
}

console.log("");
console.table(
  (await compare()).map((row) => ({
    request: `GET ${row.path}`,
    [TARGETS[0].name]: row.answers[0],
    [TARGETS[1].name]: row.answers[1],
    "": row.differs ? "≠ DIFFERS" : "same",
  })),
);
console.log(`\nSame comparison as a page: ${TARGETS[0].origin}/ (Ctrl+C to stop)`);
