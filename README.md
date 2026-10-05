# OpenNext repros

Minimal reproductions of behaviour differences between Next.js and the same app built with
[OpenNext](https://opennext.js.org/aws) (`@opennextjs/aws`), each with a proposed fix.

| Repro | Expected (Next.js) | Actual (`@opennextjs/aws` 4.1.5) |
| ----- | ------------------ | -------------------------------- |
| [`trailing-slash-api`](./trailing-slash-api) | With `trailingSlash: true`, `/api/hello` redirects to `/api/hello/` (308). | No redirect for `/api/*` routes (200). |
| [`has-query-condition`](./has-query-condition) | A `has` / `missing` condition of type `query` without `value` tests whether the key is present. | It matches whether the key is present or not. |
| [`external-rewrite-port`](./external-rewrite-port) | A rewrite with params to `http://host:port/:path*` is proxied (200). | 500 Internal Server Error. |
| [`next-data-query-leak`](./next-data-query-leak) | Pages Router: `/_next/data/…/ssr.json?foo=bar` gives `query = {"foo":"bar"}`. | `query` also has `"__nextDataReq":"1"`. |
| [`isr-double-revalidation`](./isr-double-revalidation) | A stale ISR page is regenerated once. | It is regenerated twice. |
| [`revalidate-tag-stale-fetch`](./revalidate-tag-stale-fetch) | After `revalidateTag(tag, "max")`, a cached `fetch` without `next.revalidate` is refreshed. | The stale data is served forever. |

With the patched `@opennextjs/aws` of each repro, the results are the ones of Next.js.

## Layout

One folder per repro, with three copies of the same minimal app:

```
<repro>/
  README.md            what is wrong, expected (Next.js) vs actual (OpenNext 4.1.5), with the results of the three copies
  expected.json        the same results, as data (checked by the CI)
  next/                plain Next.js
  opennext/            the same app + @opennextjs/aws 4.1.5: shows the bug
  opennext-patched/    the same app + the patched @opennextjs/aws: shows the fix
```

The app source is identical, byte for byte, in the three copies. They only differ in:

- `package.json`: the `@opennextjs/aws` dependency, and the scripts that build and run the server
- `package-lock.json`
- `open-next.config.ts` (OpenNext copies only, identical in both): runs OpenNext as a
  [local Node server](https://opennext.js.org/aws/contribute/local_run)

## Run a copy

The commands are the same in every copy (Node 22):

```sh
cd trailing-slash-api/opennext
npm install
npm run build
npm start            # http://localhost:3000
```

and in another terminal, in the same folder:

```sh
npm run check        # sends the requests of the repro to the server and prints what it answers
```

```
┌─────────────────┬──────────────────────┐
│ (index)         │ result               │
├─────────────────┼──────────────────────┤
│ GET /api/hello  │ '200'                │
│ GET /api/hello/ │ '200'                │
│ GET /page       │ '308 → /page/'       │
│ GET /page/      │ '200'                │
└─────────────────┴──────────────────────┘
```

Then stop the server, and do the same in `../next` and `../opennext-patched` to compare.

- `npm run build` is `next build` in `next/`, and `open-next build` (which runs `next build`) in the OpenNext copies.
- `npm start` is `next start` in `next/`, and the Node server built by OpenNext in the OpenNext copies. For the repros
  that need a helper server (`external-rewrite-port`, `isr-double-revalidation`, `revalidate-tag-stale-fetch`),
  `npm start` runs it next to the server, on port 3002.
- `npm run check` reads the URL of the server from `SERVER_URL` (default: `http://localhost:3000`).

## Run everything

```sh
npm run all                                        # the 6 repros × 3 copies, one after the other
node scripts/run.mjs isr-double-revalidation       # the three copies of a repro
node scripts/run.mjs isr-double-revalidation next  # one copy
```

For each copy, this runs `npm ci`, `npm run build`, `npm start` and `npm run check`, and compares the results with
`<repro>/expected.json`: `next` must give the expected results, `opennext` must show the bug as documented, and
`opennext-patched` must give the same results as `next`.

```
┌────────────────────────────┬──────────────┬────────────────────┬──────────────────┐
│ (index)                    │ next         │ opennext           │ opennext-patched │
├────────────────────────────┼──────────────┼────────────────────┼──────────────────┤
│ external-rewrite-port      │ '✓ expected' │ '✓ bug reproduced' │ '✓ fixed'        │
│ has-query-condition        │ '✓ expected' │ '✓ bug reproduced' │ '✓ fixed'        │
│ isr-double-revalidation    │ '✓ expected' │ '✓ bug reproduced' │ '✓ fixed'        │
│ next-data-query-leak       │ '✓ expected' │ '✓ bug reproduced' │ '✓ fixed'        │
│ revalidate-tag-stale-fetch │ '✓ expected' │ '✓ bug reproduced' │ '✓ fixed'        │
│ trailing-slash-api         │ '✓ expected' │ '✓ bug reproduced' │ '✓ fixed'        │
└────────────────────────────┴──────────────┴────────────────────┴──────────────────┘
```

The [CI](./.github/workflows/repros.yml) runs the same thing, with one job per copy. A green
"… / opennext 4.1.5 (bug reproduced)" job means that the bug was observed as documented.

## The patched `@opennextjs/aws`

Each `opennext-patched/` depends on a [pkg.pr.new](https://pkg.pr.new) preview of `@opennextjs/aws`, built by the
`Pre-release` workflow of the repository from the branch of the fix (linked in the README of the repro):

```json
"@opennextjs/aws": "https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@afeae9a",
```

The URL is `https://pkg.pr.new/<owner>/<repo>/@opennextjs/aws@<commit>`, where `<owner>/<repo>` is the repository
whose workflow published the preview and `<commit>` is the commit hash as printed by the workflow. To use another
build, change that one line of `opennext-patched/package.json`, then run `npm install` in that folder (which updates
the lockfile). `npm run sync` keeps that line as it is.

## Maintaining the copies

`<repro>/next/` is the source of truth. `npm run sync` (`scripts/sync.mjs`) regenerates `opennext/` and
`opennext-patched/` from it: it copies the app, writes their `package.json` (the one of `next/` + the OpenNext
dependency and scripts), and updates the lockfiles when needed (`npm run sync -- --lock` to regenerate them all).
The only files of the derived copies that are edited by hand are `opennext/open-next.config.ts` (copied to
`opennext-patched/`) and the `"@opennextjs/aws"` line of
`opennext-patched/package.json`.

`npm run check-copies` (`scripts/check-copies.mjs`, also run by the CI) fails if the copies of a repro differ outside
of that allow-list.
