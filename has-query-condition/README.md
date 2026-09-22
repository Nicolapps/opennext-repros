# `has` / `missing` query conditions match when the query key is absent on OpenNext

[Open in StackBlitz](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/has-query-condition)

## What is wrong

Redirects, rewrites and headers in `next.config.ts` can be restricted with
[`has` and `missing` conditions](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects#header-cookie-and-query-matching).
For a condition of type `query` without a `value`, Next.js checks that the query key is present. OpenNext's
`routeHasMatcher` ([`core/routing/matcher.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/routing/matcher.ts))
tests the value against an empty regex even when the key is absent, so such a condition always matches:

- a rule with `has: [{ type: "query", key: "preview" }]` also applies when `preview` is absent;
- a rule with `missing: [{ type: "query", key: "preview" }]` never applies.

| Request                  | Expected (`next start`)    | Actual (OpenNext)          |
| ------------------------ | -------------------------- | -------------------------- |
| `GET /has`               | `200`                      | `307 → /matched`           |
| `GET /has?preview=1`     | `307 → /matched?preview=1` | `307 → /matched?preview=1` |
| `GET /missing`           | `307 → /matched`           | `200`                      |
| `GET /missing?preview=1` | `200`                      | `200`                      |

## The repro

- `next.config.ts` — two redirects to `/matched`: `/has` (with a `has` query condition) and `/missing` (with a `missing` one)
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run)
- `compare.mjs` — sends the same requests to both servers without following redirects
- `app/page.tsx` — shows the comparison as a table

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## Run it

```sh
npm install
npm run repro
```

This builds the app with Next.js and OpenNext (`open-next build`), starts `next start` on http://localhost:3000 and
the OpenNext server on http://localhost:3001, and prints the comparison. The same table is rendered at
http://localhost:3000/.

```
┌─────────┬──────────────────────────┬────────────────────────────┬────────────────────────────┬─────────────┐
│ (index) │ request                  │ next start                 │ OpenNext                   │             │
├─────────┼──────────────────────────┼────────────────────────────┼────────────────────────────┼─────────────┤
│ 0       │ 'GET /has'               │ '200'                      │ '307 → /matched'           │ '≠ DIFFERS' │
│ 1       │ 'GET /has?preview=1'     │ '307 → /matched?preview=1' │ '307 → /matched?preview=1' │ 'same'      │
│ 2       │ 'GET /missing'           │ '307 → /matched'           │ '200'                      │ '≠ DIFFERS' │
│ 3       │ 'GET /missing?preview=1' │ '200'                      │ '200'                      │ 'same'      │
└─────────┴──────────────────────────┴────────────────────────────┴────────────────────────────┴─────────────┘
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
