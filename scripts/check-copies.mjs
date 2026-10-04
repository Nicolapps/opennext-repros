// Fails if the three copies of a repro (next/, opennext/, opennext-patched/) differ outside of what is allowed:
//   - package.json: only the "@opennextjs/aws" dependency and the scripts that build and run the server
//   - package-lock.json
//   - open-next.config.ts: only in the OpenNext copies, identical in both
//   - vendor/*.tgz: only in opennext-patched/
// Every other file must exist in the three copies, byte for byte identical. Fix with `npm run sync`.
import fs from "node:fs";
import path from "node:path";
import { ALLOWED, BUGS, COPIES, listFiles, openNextPackageJson, readJson, ROOT } from "./lib.mjs";

const problems = [];
const same = (a, b) => fs.readFileSync(a).equals(fs.readFileSync(b));

for (const bug of BUGS) {
  const dir = (copy) => path.join(ROOT, bug, copy);
  const files = Object.fromEntries(COPIES.map((copy) => [copy, listFiles(dir(copy))]));
  const shared = files.next.filter((file) => !ALLOWED.differs.includes(file));

  for (const copy of ["opennext", "opennext-patched"]) {
    for (const file of shared) {
      if (!files[copy].includes(file)) problems.push(`${bug}/${copy}/${file} is missing`);
      else if (!same(path.join(dir("next"), file), path.join(dir(copy), file))) {
        problems.push(`${bug}/${copy}/${file} differs from ${bug}/next/${file}`);
      }
    }
    for (const file of files[copy]) {
      const allowed =
        shared.includes(file) ||
        ALLOWED.differs.includes(file) ||
        ALLOWED.openNextOnly.includes(file) ||
        (copy === "opennext-patched" && ALLOWED.patchedOnly(file));
      if (!allowed) problems.push(`${bug}/${copy}/${file} is not in ${bug}/next/, and not in the allow-list`);
    }
    for (const file of ALLOWED.differs) {
      if (!files[copy].includes(file)) problems.push(`${bug}/${copy}/${file} is missing`);
    }

    // package.json: the one of next/, except for the OpenNext dependency and scripts
    const packageJson = readJson(path.join(dir(copy), "package.json"));
    const version = packageJson.dependencies?.["@opennextjs/aws"];
    const expected = openNextPackageJson(readJson(path.join(dir("next"), "package.json")), version);
    if (!version || JSON.stringify(packageJson) !== JSON.stringify(expected)) {
      problems.push(`${bug}/${copy}/package.json differs from ${bug}/next/package.json outside of the OpenNext dependency and scripts`);
    }
  }

  for (const file of ALLOWED.openNextOnly) {
    if (files.next.includes(file)) problems.push(`${bug}/next/${file} should only exist in the OpenNext copies`);
    const [a, b] = [path.join(dir("opennext"), file), path.join(dir("opennext-patched"), file)];
    if (fs.existsSync(a) && fs.existsSync(b) && !same(a, b)) {
      problems.push(`${bug}/opennext-patched/${file} differs from ${bug}/opennext/${file}`);
    }
    for (const f of [a, b]) if (!fs.existsSync(f)) problems.push(`${path.relative(ROOT, f)} is missing`);
  }
  if (readJson(path.join(dir("next"), "package.json")).dependencies?.["@opennextjs/aws"]) {
    problems.push(`${bug}/next/package.json should not depend on @opennextjs/aws`);
  }
}

if (problems.length > 0) {
  console.error(`The copies differ outside of the allow-list (run \`npm run sync\`):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ ${BUGS.length} repros: the three copies only differ in what is allowed`);
