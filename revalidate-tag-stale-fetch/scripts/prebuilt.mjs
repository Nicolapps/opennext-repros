// Neither `next build` nor `open-next build` work in StackBlitz (WebContainers), see README.
// `pack` stores the output of a local build in `prebuilt/`: `.next/` (what `next start` needs) in `prebuilt/next/`,
// `.open-next/` (OpenNext 4.1.5) in `prebuilt/open-next/` and `.open-next-fixed/` (OpenNext + fix, see
// scripts/build-fixed.mjs) in `prebuilt/open-next-fixed/`. `unpack` restores the three.
//
// To keep `prebuilt/` small, files of `.open-next/server-functions/default/node_modules` that are byte-identical
// to the ones in `./node_modules` are not stored: they are listed (with their sha256) in `prebuilt/node_modules.json`
// and copied back from `./node_modules` by `unpack`. Files that OpenNext patched are stored as is. Likewise, files of
// `.open-next-fixed/` that are byte-identical to the same file of `.open-next/` are listed in
// `prebuilt/open-next-fixed.json` and copied from `.open-next/` by `unpack`; the files that the fix changes are stored.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BUNDLED_MODULES = ".open-next/server-functions/default/node_modules";
const MANIFEST = "prebuilt/node_modules.json";
const FIXED_MANIFEST = "prebuilt/open-next-fixed.json";
// Not needed to run the local server (`sharp` is a native addon, only used by /_next/image).
const SKIPPED = ["image-optimization-function/node_modules"];
// Not needed by `next start`: the webpack cache, the standalone output (made for OpenNext), build traces and types
const SKIPPED_NEXT = [".next/cache", ".next/standalone", ".next/trace", ".next/diagnostics", ".next/types"];
const isNftFile = (file) => file.endsWith(".nft.json");

const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const listFiles = (dir) =>
  fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)));
const sameContent = (a, b) => fs.existsSync(a) && fs.existsSync(b) && sha256(a) === sha256(b);

function store(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function pack() {
  fs.rmSync("prebuilt", { recursive: true, force: true });
  for (const file of listFiles(".next")) {
    const source = path.join(".next", file);
    if (SKIPPED_NEXT.some((dir) => source.startsWith(dir)) || isNftFile(file)) continue;
    store(source, path.join("prebuilt/next", file));
  }
  const fromNodeModules = {};
  for (const file of listFiles(".open-next")) {
    if (SKIPPED.some((dir) => file.startsWith(dir))) continue;
    const source = path.join(".open-next", file);
    const installed = path.join("node_modules", path.relative(BUNDLED_MODULES, source));
    if (source.startsWith(BUNDLED_MODULES) && sameContent(installed, source)) {
      fromNodeModules[path.relative(BUNDLED_MODULES, source)] = sha256(source);
      continue;
    }
    store(source, path.join("prebuilt/open-next", file));
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(fromNodeModules, null, 1));
  const fromOpenNext = [];
  for (const file of listFiles(".open-next-fixed")) {
    if (SKIPPED.some((dir) => file.startsWith(dir))) continue;
    if (sameContent(path.join(".open-next", file), path.join(".open-next-fixed", file))) fromOpenNext.push(file);
    else store(path.join(".open-next-fixed", file), path.join("prebuilt/open-next-fixed", file));
  }
  fs.writeFileSync(FIXED_MANIFEST, JSON.stringify(fromOpenNext, null, 1));
  console.log(
    `prebuilt/: ${listFiles("prebuilt").length} files stored, ${Object.keys(fromNodeModules).length} taken from node_modules, ` +
      `${fromOpenNext.length} of open-next-fixed/ taken from open-next/`,
  );
}

function unpack() {
  fs.rmSync(".next", { recursive: true, force: true });
  fs.cpSync("prebuilt/next", ".next", { recursive: true });
  fs.rmSync(".open-next", { recursive: true, force: true });
  fs.cpSync("prebuilt/open-next", ".open-next", { recursive: true });
  for (const [file, hash] of Object.entries(JSON.parse(fs.readFileSync(MANIFEST, "utf8")))) {
    const installed = path.join("node_modules", file);
    if (sha256(installed) !== hash) console.warn(`warning: ${installed} differs from the one used for the prebuilt output`);
    store(installed, path.join(BUNDLED_MODULES, file));
  }
  fs.rmSync(".open-next-fixed", { recursive: true, force: true });
  fs.cpSync("prebuilt/open-next-fixed", ".open-next-fixed", { recursive: true });
  for (const file of JSON.parse(fs.readFileSync(FIXED_MANIFEST, "utf8"))) {
    store(path.join(".open-next", file), path.join(".open-next-fixed", file));
  }
}

({ pack, unpack })[process.argv[2]]();
