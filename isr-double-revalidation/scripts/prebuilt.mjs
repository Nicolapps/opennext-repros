// Neither `next build` nor `open-next build` work in StackBlitz (WebContainers), see README.
// `pack` stores the output of a local build in `prebuilt/`: `.next/` (what `next start` needs) in `prebuilt/next/`,
// and `.open-next/` in `prebuilt/open-next/`. `unpack` restores both.
//
// To keep `prebuilt/` small, files of `.open-next/server-functions/default/node_modules` that are byte-identical
// to the ones in `./node_modules` are not stored: they are listed (with their sha256) in `prebuilt/node_modules.json`
// and copied back from `./node_modules` by `unpack`. Files that OpenNext patched are stored as is.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BUNDLED_MODULES = ".open-next/server-functions/default/node_modules";
const MANIFEST = "prebuilt/node_modules.json";
// Not needed to run the local server (`sharp` is a native addon, only used by /_next/image).
const SKIPPED = [".open-next/image-optimization-function/node_modules"];
// Not needed by `next start`: the webpack cache, the standalone output (made for OpenNext), build traces and types
const SKIPPED_NEXT = [".next/cache", ".next/standalone", ".next/trace", ".next/diagnostics", ".next/types"];
const isNftFile = (file) => file.endsWith(".nft.json");

const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const listFiles = (dir) =>
  fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)));

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
    const source = path.join(".open-next", file);
    if (SKIPPED.some((dir) => source.startsWith(dir))) continue;
    const installed = path.join("node_modules", path.relative(BUNDLED_MODULES, source));
    if (source.startsWith(BUNDLED_MODULES) && fs.existsSync(installed) && sha256(installed) === sha256(source)) {
      fromNodeModules[path.relative(BUNDLED_MODULES, source)] = sha256(source);
      continue;
    }
    store(source, path.join("prebuilt/open-next", file));
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(fromNodeModules, null, 1));
  console.log(`prebuilt/: ${listFiles("prebuilt").length} files stored, ${Object.keys(fromNodeModules).length} taken from node_modules`);
}

function unpack() {
  fs.rmSync(".next", { recursive: true, force: true });
  fs.cpSync("prebuilt/next", ".next", { recursive: true });
  fs.rmSync(".open-next", { recursive: true, force: true });
  fs.cpSync("prebuilt/open-next", ".open-next", { recursive: true });
  for (const [file, hash] of Object.entries(JSON.parse(fs.readFileSync(MANIFEST, "utf8")))) {
    const installed = path.join("node_modules", file);
    if (sha256(installed) !== hash) console.warn(`warning: ${installed} differs from the one used for the prebuilt output`);
    fs.mkdirSync(path.dirname(path.join(BUNDLED_MODULES, file)), { recursive: true });
    fs.copyFileSync(installed, path.join(BUNDLED_MODULES, file));
  }
}

({ pack, unpack })[process.argv[2]]();
