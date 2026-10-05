// Regenerates `<bug>/opennext/` and `<bug>/opennext-patched/` from `<bug>/next/`, so that the three copies cannot drift.
//
//   node scripts/sync.mjs            regenerate the copies (and the lockfiles that are missing or outdated)
//   node scripts/sync.mjs --lock     also regenerate all the lockfiles
//
// What is edited by hand:
//   <bug>/next/**                              the app, its `npm run check`, its helper
//   <bug>/opennext/open-next.config.ts         the OpenNext configuration (copied to opennext-patched/)
//   <bug>/opennext-patched/vendor/*.tgz        optional: a locally built tarball of the patched @opennextjs/aws
//   the "@opennextjs/aws" line of <bug>/opennext-patched/package.json (kept as is; see the README)
// Everything else in opennext/ and opennext-patched/ is overwritten.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ALLOWED, BUGS, listFiles, openNextPackageJson, readJson, ROOT } from "./lib.mjs";

const OPENNEXT_VERSION = "4.1.5";
const relock = process.argv.includes("--lock");

function lock(dir) {
  console.log(`Updating the lockfile of ${path.relative(ROOT, dir)}`);
  fs.rmSync(path.join(dir, "package-lock.json"), { force: true });
  execSync("npm install --package-lock-only --ignore-scripts --no-audit --no-fund", { cwd: dir, stdio: "inherit" });
}

for (const bug of BUGS) {
  const source = path.join(ROOT, bug, "next");
  const sourceFiles = listFiles(source).filter((file) => !ALLOWED.differs.includes(file));
  const nextPackageJson = readJson(path.join(source, "package.json"));
  if (relock || !fs.existsSync(path.join(source, "package-lock.json"))) lock(source);

  for (const copy of ["opennext", "opennext-patched"]) {
    const target = path.join(ROOT, bug, copy);

    // 1. The app: identical to next/
    for (const file of listFiles(target)) {
      const keep =
        sourceFiles.includes(file) ||
        ALLOWED.differs.includes(file) ||
        ALLOWED.openNextOnly.includes(file) ||
        (copy === "opennext-patched" && ALLOWED.patchedOnly(file));
      if (!keep) fs.rmSync(path.join(target, file));
    }
    for (const file of sourceFiles) {
      fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
      fs.copyFileSync(path.join(source, file), path.join(target, file));
    }

    // 2. The OpenNext configuration: the one of opennext/
    if (copy === "opennext-patched") {
      for (const file of ALLOWED.openNextOnly) {
        fs.copyFileSync(path.join(ROOT, bug, "opennext", file), path.join(target, file));
      }
    }

    // 3. package.json: the one of next/ + OpenNext
    const packageJsonPath = path.join(target, "package.json");
    const before = fs.existsSync(packageJsonPath) ? fs.readFileSync(packageJsonPath, "utf8") : "";
    let version = OPENNEXT_VERSION;
    if (copy === "opennext-patched") {
      // Keep the dependency that is there (a pkg.pr.new URL); fall back to a tarball in vendor/ if there is one
      const [tarball] = listFiles(target).filter(ALLOWED.patchedOnly);
      version = (before && JSON.parse(before).dependencies?.["@opennextjs/aws"]) || `file:${tarball}`;
    }
    const after = `${JSON.stringify(openNextPackageJson(nextPackageJson, version), null, 2)}\n`;
    fs.writeFileSync(packageJsonPath, after);

    // 4. The lockfile
    if (relock || before !== after || !fs.existsSync(path.join(target, "package-lock.json"))) lock(target);
  }
  console.log(`✓ ${bug}`);
}
