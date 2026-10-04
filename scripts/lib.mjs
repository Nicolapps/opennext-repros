// Shared by the scripts of this folder: the list of repros, and the files of a copy.
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");

/** The repros: every folder of the repository with a `next/` folder. */
export const BUGS = fs
  .readdirSync(ROOT)
  .filter((name) => fs.existsSync(path.join(ROOT, name, "next", "package.json")))
  .sort();

/** `next` is the source of truth; `opennext` and `opennext-patched` are derived from it by scripts/sync.mjs. */
export const COPIES = ["next", "opennext", "opennext-patched"];

/** What a copy may have that `next/` does not have, or has differently. Everything else is identical in the three copies. */
export const ALLOWED = {
  // Differ in every copy: the `@opennextjs/aws` dependency and the `build`, `build:next`, `start` / `server` scripts
  differs: ["package.json", "package-lock.json"],
  // Only in the OpenNext copies, identical in both
  openNextOnly: ["open-next.config.ts"],
  // Only in `opennext-patched/`: the tarball of the patched `@opennextjs/aws`
  patchedOnly: (file) => /^vendor\/[^/]+\.tgz$/.test(file),
};

const IGNORED = new Set(["node_modules", ".next", ".open-next", "next-env.d.ts", ".DS_Store"]);

/** The files of a folder (relative paths with `/`), without what is installed or built. */
export function listFiles(dir, prefix = "") {
  return fs
    .readdirSync(path.join(dir, prefix), { withFileTypes: true })
    .filter((entry) => !IGNORED.has(entry.name))
    .flatMap((entry) => {
      const file = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? listFiles(dir, file) : [file];
    })
    .sort();
}

/** The `package.json` of an OpenNext copy: the one of `next/`, with OpenNext as a dependency and in the scripts. */
export function openNextPackageJson(nextPackageJson, openNextVersion) {
  const { build, ...scripts } = nextPackageJson.scripts;
  // The script that runs the server: `server` when `start` also runs a helper (start.mjs), `start` otherwise
  const server = "server" in scripts ? "server" : "start";
  return {
    ...nextPackageJson,
    scripts: {
      build: "open-next build", // runs `npm run build:next` (see open-next.config.ts), then bundles the app
      "build:next": build,
      ...scripts,
      [server]: "cd .open-next/server-functions/default && node index.mjs",
    },
    dependencies: { "@opennextjs/aws": openNextVersion, ...nextPackageJson.dependencies },
  };
}

export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
