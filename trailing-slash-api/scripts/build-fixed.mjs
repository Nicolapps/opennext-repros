// Builds the app with the proposed fix of OpenNext, into `.open-next-fixed/`.
//
// The fixed package is `vendor/opennextjs-aws-4.1.5-*.tgz` (`@opennextjs/aws` 4.1.5 built from source with the fix
// applied, see README). It is installed in `vendor/node_modules` with its dependencies, then run on the `.next/` of the
// previous `open-next build` (`next build` is not run again, see open-next.fixed.config.ts), so that all three servers
// of the comparison run the same Next.js build.
import { execSync } from "node:child_process";
import fs from "node:fs";

const run = (command, options) => execSync(command, { stdio: "inherit", ...options });

if (!fs.existsSync(".next/standalone") || !fs.existsSync(".open-next")) {
  throw new Error("Run `npx open-next build` first: it produces the .next/ that this build reuses");
}

run("npm install --no-audit --no-fund", { cwd: "vendor" });

// `open-next build` always writes to `.open-next/`: set the output of 4.1.5 aside meanwhile.
fs.rmSync(".open-next-fixed", { recursive: true, force: true });
fs.renameSync(".open-next", ".open-next-4.1.5");
try {
  run("node vendor/node_modules/@opennextjs/aws/dist/index.js build --config-path open-next.fixed.config.ts");
  fs.renameSync(".open-next", ".open-next-fixed");
} finally {
  fs.rmSync(".open-next", { recursive: true, force: true }); // left over by a failed build
  fs.renameSync(".open-next-4.1.5", ".open-next");
}
