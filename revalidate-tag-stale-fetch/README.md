# A cached `fetch` without `next.revalidate` is never refreshed after `revalidateTag(tag, "max")` on OpenNext

## What is wrong

Since Next.js 16, `revalidateTag(tag, "max")` marks the entries of a tag as stale: the next request still gets the
stale data, the data is refreshed in the background, and the requests after that get the fresh data.

For a stale entry of the fetch cache, OpenNext reports `lastModified: 1` to Next.js (`getFetchCache` in
[`adapters/cache.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/adapters/cache.ts)).
Next.js considers a fetch cache entry as stale when `(now - lastModified) / 1000 > revalidate`. A `fetch` without
`next.revalidate` has a `revalidate` of `0xfffffffe` seconds (~136 years), which is more than the time elapsed since
the epoch: the entry is never seen as stale, never refreshed, and the stale data is served forever.

| `npm run check`                                       | `next/` (expected) | `opennext/` (4.1.5) | `opennext-patched/` |
| ----------------------------------------------------- | ------------------ | ------------------- | ------------------- |
| `GET /data/<id>` (not cached yet)                     | `200 v1`           | `200 v1`            | `200 v1`            |
| `GET /data/<id>` (cached)                             | `200 v1`           | `200 v1`            | `200 v1`            |
| `GET /revalidate/<id>` (revalidateTag(tag, "max"))    | `200 revalidated`  | `200 revalidated`   | `200 revalidated`   |
| `GET /data/<id>` (stale, refreshed in the background) | `200 v1`           | `200 v1`            | `200 v1`            |
| `GET /data/<id>` (1s later)                           | `200 v2`           | **`200 v1`**        | `200 v2`            |
| `GET /data/<id>` (2s later)                           | `200 v2`           | **`200 v1`**        | `200 v2`            |

With `next: { revalidate: 3600 }` on the `fetch`, OpenNext refreshes the data as expected. (With the `fs-dev` tag
cache instead of `fs-dev-nextMode`, the local server behaves differently: it does not serve the stale data at all, the
first request after `revalidateTag` already gets `v2`.)

## Layout

The same minimal app, three times. The app source is identical in the three folders; they only differ in
`package.json` (dependencies and scripts), in the lockfile, and in the OpenNext-only files.

| Folder | What it runs | Result |
| ------ | ------------ | ------ |
| [`next/`](./next) | Next.js (`next build`, `next start`) | expected |
| [`opennext/`](./opennext) | `@opennextjs/aws` 4.1.5, as a [local Node server](https://opennext.js.org/aws/contribute/local_run) | the bug |
| [`opennext-patched/`](./opennext-patched) | the same, with the patched `@opennextjs/aws` ([pkg.pr.new](https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@e5d1424) preview of the fix) | same as `next/` |

- `app/data/[id]/route.ts` — returns the result of a cached `fetch` with a tag, and without `next.revalidate`
- `app/revalidate/[id]/route.ts` — calls `revalidateTag(tag, "max")`
- `counter.mjs` — the data source of that `fetch`: a tiny HTTP server that answers `v1`, then `v2`, …
- `check.mjs` (`npm run check`) — runs the steps above, with a new `id` each time
- `open-next.config.ts` (OpenNext copies) — uses the `fs-dev-nextMode` tag cache (like the `open-next.config.local.ts` of the examples of the OpenNext repository)
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
`npm start` also runs `counter.mjs` (the data source of the cached `fetch`) on port 3002 (`COUNTER_PORT`).

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## The fix

[`fix/stale-fetch-cache-last-modified`](https://github.com/Nicolapps/opennextjs-aws/tree/fix/stale-fetch-cache-last-modified)
([diff](https://github.com/Nicolapps/opennextjs-aws/pull/6/files)).
`opennext-patched/` installs the [pkg.pr.new](https://pkg.pr.new) preview of that branch at commit `e5d1424`:
`https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@e5d1424`.
To try another build of the fix, change the
`"@opennextjs/aws"` line of `opennext-patched/package.json`: see the [README at the root](../README.md#the-patched-opennextjsaws).
