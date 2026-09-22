# A stale ISR page (Pages Router) is regenerated twice on OpenNext

[Open in StackBlitz](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/isr-double-revalidation)

## What is wrong

When a stale ISR page is requested, OpenNext serves the stale version and sends a message to its revalidation queue,
which regenerates the page. For that to be the only regeneration, OpenNext patches Next.js so that it does not
regenerate the page in the background of the request itself (`patchBackgroundRevalidation`, in
[`build/patch/patches/patchBackgroundRevalidation.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/build/patch/patches/patchBackgroundRevalidation.ts)).

The patch looks for `!cachedResponse.isStale || context.isPrefetch` in `next/dist/server/response-cache/index.js`.
In recent versions of Next.js the variable is named `previousIncrementalCacheEntry`, so the patch silently does not
apply anymore, and every stale hit renders the page **twice**: once by Next.js, once by the revalidation queue.

| Request                                                                 | Expected (`next start`) | Actual (OpenNext) |
| ----------------------------------------------------------------------- | ----------------------- | ----------------- |
| `GET /pages-isr/<id>` (1st request: not cached yet)                     | `200, 1 render`         | `200, 1 render`   |
| `GET /pages-isr/<id>` (3s later: stale, regenerated in the background)  | `200, 1 render`         | `200, 2 renders`  |
| `GET /isr/<id>` (1st request: not cached yet)                           | `200, 1 render`         | `200, 1 render`   |
| `GET /isr/<id>` (3s later: stale, regenerated in the background)        | `200, 1 render`         | `200, 1 render`   |

In this setup, only the Pages Router page (`/pages-isr/<id>`) is rendered twice; the App Router page (`/isr/<id>`)
is included for comparison.

## The repro

- `pages/pages-isr/[id].tsx` — a Pages Router ISR page (`revalidate: 2`, `fallback: "blocking"`, nothing prerendered
  at build time); `app/isr/[id]/page.tsx` — the same with the App Router
- `lib/count-render.ts` — called on every render of these pages: reports it to the counter
- `counter.mjs` — a tiny HTTP server on port 3002 that counts the renders per server and page
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run),
  with the `direct` revalidation queue
- `compare.mjs` — on both servers: requests a new page, counts the renders of the next 3 seconds, and does it again
- `app/page.tsx` — shows the comparison as a table (takes about 6 seconds to load)

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## Run it

```sh
npm install
npm run repro
```

This builds the app with Next.js and OpenNext (`open-next build`), starts `next start` on http://localhost:3000 and
the OpenNext server on http://localhost:3001, and prints the comparison. The same table is rendered at
http://localhost:3000/. The render counter runs on http://localhost:3002; the comparison takes about 6 seconds.

```
┌─────────┬──────────────────────────────────────────────────────────────────────────┬─────────────────┬──────────────────┬─────────────┐
│ (index) │ request                                                                  │ next start      │ OpenNext         │             │
├─────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────┼──────────────────┼─────────────┤
│ 0       │ 'GET /pages-isr/4tfvmi (1st request: not cached yet)'                    │ '200, 1 render' │ '200, 1 render'  │ 'same'      │
│ 1       │ 'GET /pages-isr/4tfvmi (3s later: stale, regenerated in the background)' │ '200, 1 render' │ '200, 2 renders' │ '≠ DIFFERS' │
│ 2       │ 'GET /isr/4tfvmi (1st request: not cached yet)'                          │ '200, 1 render' │ '200, 1 render'  │ 'same'      │
│ 3       │ 'GET /isr/4tfvmi (3s later: stale, regenerated in the background)'       │ '200, 1 render' │ '200, 1 render'  │ 'same'      │
└─────────┴──────────────────────────────────────────────────────────────────────────┴─────────────────┴──────────────────┴─────────────┘
```

## On StackBlitz: prebuilt output

StackBlitz runs Node in the browser (WebContainers), and neither build works there:

- `next build` fails while prerendering, with the WASM build of SWC that WebContainers use
  (`Error occurred prerendering page "/_global-error" … Invariant: Expected workStore to be initialized. This is a
  bug in Next.js.`). This is unrelated to OpenNext, and does not happen with a regular Node.
- `open-next build` needs native binaries: it imports `@ast-grep/napi` (a native addon with no WASM fallback
  published) and installs `sharp` for the image optimization function.

So on StackBlitz, `npm run repro` builds nothing: it uses the output of a local build, committed in `prebuilt/`
(`prebuilt/next/` is what `next start` needs from `.next/`, `prebuilt/open-next/` is `.open-next/`, both from the
same `next build`). *Running* them only needs JavaScript.

`prebuilt/` is regenerated with `npm run build:prebuilt` (`open-next build`, then `scripts/prebuilt.mjs pack`). To keep
it small, the webpack cache, standalone output and build traces of `.next/` are left out, and the files of the bundled `node_modules` of
OpenNext that are identical to the installed ones are listed in `prebuilt/node_modules.json` rather than stored, and
copied back from `node_modules` at startup; the files that OpenNext patches are stored as is. Outside StackBlitz,
`prebuilt/` is not used, unless you set `USE_PREBUILT=1`.
