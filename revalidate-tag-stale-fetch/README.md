# A cached `fetch` without `next.revalidate` is never refreshed after `revalidateTag(tag, "max")` on OpenNext

[Open in StackBlitz](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/revalidate-tag-stale-fetch)

## What is wrong

Since Next.js 16, `revalidateTag(tag, "max")` marks the entries of a tag as stale: the next request still gets the
stale data, the data is refreshed in the background, and the requests after that get the fresh data.

For a stale entry of the fetch cache, OpenNext reports `lastModified: 1` to Next.js (`getFetchCache` in
[`adapters/cache.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/adapters/cache.ts)).
Next.js considers a fetch cache entry as stale when `(now - lastModified) / 1000 > revalidate`. A `fetch` without
`next.revalidate` has a `revalidate` of `0xfffffffe` seconds (~136 years), which is more than the time elapsed since
the epoch: the entry is never seen as stale, never refreshed, and the stale data is served forever.

| Request                                               | Expected (`next start`) | Actual (OpenNext) |
| ----------------------------------------------------- | ----------------------- | ----------------- |
| `GET /data/<id>` (not cached yet)                     | `200 v1`                | `200 v1`          |
| `GET /data/<id>` (cached)                             | `200 v1`                | `200 v1`          |
| `GET /revalidate/<id>` (`revalidateTag(tag, "max")`)  | `200 revalidated`       | `200 revalidated` |
| `GET /data/<id>` (stale, refreshed in the background) | `200 v1`                | `200 v1`          |
| `GET /data/<id>` (1s later)                           | `200 v2`                | `200 v1`          |
| `GET /data/<id>` (2s later)                           | `200 v2`                | `200 v1`          |

With `next: { revalidate: 3600 }` on the `fetch`, OpenNext refreshes the data as expected. (With the `fs-dev` tag
cache instead of `fs-dev-nextMode`, the local server behaves differently: it does not serve the stale data at all, the
first request after `revalidateTag` already gets `v2`.)

## The repro

- `app/data/[id]/route.ts` — returns the result of a cached `fetch` with a tag, and without `next.revalidate`
- `app/revalidate/[id]/route.ts` — calls `revalidateTag(tag, "max")`
- `counter.mjs` — the data source of that `fetch`: a tiny HTTP server on port 3002 that answers `v1`, then `v2`, …
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run),
  with the `fs-dev-nextMode` tag cache (like the `open-next.config.local.ts` of the examples of the OpenNext repository)
- `compare.mjs` — runs the steps above on both servers, with a new `id` each time
- `app/page.tsx` — shows the comparison as a table (takes about 3 seconds to load)

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## Run it

```sh
npm install
npm run repro
```

This builds the app with Next.js and OpenNext (`open-next build`), starts `next start` on http://localhost:3000 and
the OpenNext server on http://localhost:3001, and prints the comparison. The same table is rendered at
http://localhost:3000/. The data source of the cached `fetch` runs on http://localhost:3002; the comparison takes about 3 seconds.

```
┌─────────┬────────────────────────────────────────────────────────────────┬───────────────────┬───────────────────┬─────────────┐
│ (index) │ request                                                        │ next start        │ OpenNext          │             │
├─────────┼────────────────────────────────────────────────────────────────┼───────────────────┼───────────────────┼─────────────┤
│ 0       │ 'GET /data/vmknyc (not cached yet)'                            │ '200 v1'          │ '200 v1'          │ 'same'      │
│ 1       │ 'GET /data/vmknyc (cached)'                                    │ '200 v1'          │ '200 v1'          │ 'same'      │
│ 2       │ 'GET /revalidate/vmknyc (revalidateTag("data-vmknyc", "max"))' │ '200 revalidated' │ '200 revalidated' │ 'same'      │
│ 3       │ 'GET /data/vmknyc (stale, refreshed in the background)'        │ '200 v1'          │ '200 v1'          │ 'same'      │
│ 4       │ 'GET /data/vmknyc (1s later)'                                  │ '200 v2'          │ '200 v1'          │ '≠ DIFFERS' │
│ 5       │ 'GET /data/vmknyc (2s later)'                                  │ '200 v2'          │ '200 v1'          │ '≠ DIFFERS' │
└─────────┴────────────────────────────────────────────────────────────────┴───────────────────┴───────────────────┴─────────────┘
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
