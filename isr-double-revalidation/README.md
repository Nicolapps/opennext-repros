# A stale ISR page (Pages Router) is regenerated twice on OpenNext

## What is wrong

When a stale ISR page is requested, OpenNext serves the stale version and sends a message to its revalidation queue,
which regenerates the page. For that to be the only regeneration, OpenNext patches Next.js so that it does not
regenerate the page in the background of the request itself (`patchBackgroundRevalidation`, in
[`build/patch/patches/patchBackgroundRevalidation.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/build/patch/patches/patchBackgroundRevalidation.ts)).

The patch looks for `!cachedResponse.isStale || context.isPrefetch` in `next/dist/server/response-cache/index.js`.
It silently does not apply anymore, for two reasons:

- in recent versions of Next.js the variable is named `previousIncrementalCacheEntry`;
- pages run from the compiled runtime bundles of Next.js (`next/dist/compiled/next-server/pages.runtime.prod.js`,
  `app-page.runtime.prod.js`, …), which have their own minified copy of the response cache
  (`!a.isStale||r.isPrefetch`), and these files are not patched.

So every stale hit renders the page **twice**: once by Next.js, once by the revalidation queue.

| `npm run check`                                                        | `next/` (expected) | `opennext/` (4.1.5)  | `opennext-patched/` |
| ---------------------------------------------------------------------- | ------------------ | -------------------- | ------------------- |
| `GET /pages-isr/<id>` (1st request: not cached yet)                    | `200, 1 render`    | `200, 1 render`      | `200, 1 render`     |
| `GET /pages-isr/<id>` (3s later: stale, regenerated in the background) | `200, 1 render`    | **`200, 2 renders`** | `200, 1 render`     |
| `GET /isr/<id>` (1st request: not cached yet)                          | `200, 1 render`    | `200, 1 render`      | `200, 1 render`     |
| `GET /isr/<id>` (3s later: stale, regenerated in the background)       | `200, 1 render`    | `200, 1 render`      | `200, 1 render`     |

The App Router page (`/isr/<id>`) has the same problem, but it does not show here: with the `direct` queue of the
local server, the second regeneration starts while the first one is still running in the same process, and Next.js
merges the two. With a real queue, both happen.

## Layout

The same minimal app, three times. The app source is identical in the three folders; they only differ in
`package.json` (dependencies and scripts), in the lockfile, and in the OpenNext-only files.

| Folder | What it runs | Result |
| ------ | ------------ | ------ |
| [`next/`](./next) | Next.js (`next build`, `next start`) | expected |
| [`opennext/`](./opennext) | `@opennextjs/aws` 4.1.5, as a [local Node server](https://opennext.js.org/aws/contribute/local_run) | the bug |
| [`opennext-patched/`](./opennext-patched) | the same, with a patched `@opennextjs/aws` (`vendor/opennextjs-aws-4.1.5-background-revalidation-patch.tgz`) | same as `next/` |

- `pages/pages-isr/[id].tsx` — a Pages Router ISR page (`revalidate: 2`, `fallback: "blocking"`, nothing prerendered at build time); `app/isr/[id]/page.tsx` — the same with the App Router
- `lib/count-render.ts` — called on every render of these pages: reports it to the counter
- `counter.mjs` — a tiny HTTP server that counts the renders per page
- `check.mjs` (`npm run check`) — requests a new page, counts the renders of the next 3 seconds, and does it again (takes about 12 seconds)
- `open-next.config.ts` (OpenNext copies) — uses the `direct` revalidation queue
- `open-next.config.ts` (OpenNext copies) — runs OpenNext as a local Node server (`express-dev` wrapper, `fs-dev` caches)

## Run it

In any of the three folders:

```sh
npm install
npm run build
npm start          # the server, on http://localhost:3000; also runs the helper (see below)
```

and in another terminal, in the same folder:

```sh
npm run check      # sends the requests to http://localhost:3000 (or SERVER_URL) and prints the results
```

Run one folder at a time: they use the same ports (`PORT`, default 3000).
`npm start` also runs `counter.mjs` (counts the renders) on port 3002 (`COUNTER_PORT`).

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## The fix

[`fix/background-revalidation-patch`](https://github.com/Nicolapps/opennextjs-aws/tree/fix/background-revalidation-patch)
([diff](https://github.com/Nicolapps/opennextjs-aws/pull/5/files)).
`opennext-patched/vendor/opennextjs-aws-4.1.5-background-revalidation-patch.tgz` is `@opennextjs/aws` 4.1.5 built from that branch (`pnpm pack`).
To try another build of the fix (a [pkg.pr.new](https://pkg.pr.new) preview, for instance), change the
`"@opennextjs/aws"` line of `opennext-patched/package.json`: see the [README at the root](../README.md#the-patched-opennextjsaws).
