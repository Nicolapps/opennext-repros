# `trailingSlash: true` is not applied to `/api/*` routes on OpenNext

[Open in StackBlitz](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/trailing-slash-api)

## What is wrong

With `trailingSlash: true` in `next.config.ts`, Next.js redirects every path without a trailing slash to the one
with a trailing slash — API routes included. OpenNext skips that redirect for any path starting with `/api/`
([`handleTrailingSlashRedirect` in `core/routing/matcher.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/routing/matcher.ts)).

| Request           | Expected (`next start`) | Actual (OpenNext) |
| ----------------- | ----------------------- | ----------------- |
| `GET /api/hello`  | `308 → /api/hello/`     | `200`             |
| `GET /api/hello/` | `200`                   | `200`             |
| `GET /page`       | `308 → /page/`          | `308 → /page/`    |
| `GET /page/`      | `200`                   | `200`             |

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## The repro

- `next.config.ts` — `trailingSlash: true`
- `app/api/hello/route.ts` — the API route; `app/page/page.tsx` — a regular page, as a control
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run)
- `compare.mjs` — sends the same requests to both servers without following redirects
- `app/page.tsx` — shows the comparison as a table

## Run it

```sh
npm install
npm run repro
```

This builds the app with Next.js and OpenNext (`open-next build`), starts `next start` on http://localhost:3000 and
the OpenNext server on http://localhost:3001, and prints the comparison. The same table is rendered at
http://localhost:3000/.

```
┌─────────┬───────────────────┬─────────────────────┬────────────────┬─────────────┐
│ (index) │ request           │ next start          │ OpenNext       │             │
├─────────┼───────────────────┼─────────────────────┼────────────────┼─────────────┤
│ 0       │ 'GET /api/hello'  │ '308 → /api/hello/' │ '200'          │ '≠ DIFFERS' │
│ 1       │ 'GET /api/hello/' │ '200'               │ '200'          │ 'same'      │
│ 2       │ 'GET /page'       │ '308 → /page/'      │ '308 → /page/' │ 'same'      │
│ 3       │ 'GET /page/'      │ '200'               │ '200'          │ 'same'      │
└─────────┴───────────────────┴─────────────────────┴────────────────┴─────────────┘
```

## On StackBlitz: prebuilt OpenNext output

StackBlitz runs Node in the browser (WebContainers), which cannot load native binaries. `open-next build` needs some:
it imports `@ast-grep/napi` (a native addon with no WASM fallback published) and installs `sharp` for the image
optimization function. So on StackBlitz, `npm run repro` builds the app with Next.js, but for OpenNext it uses the
output of a local `open-next build` that is committed in `prebuilt/`. *Running* that output only needs JavaScript.

`prebuilt/` is regenerated with `npm run build:prebuilt` (`open-next build`, then `scripts/prebuilt.mjs pack`). To keep
it small, the files of the bundled `node_modules` that are identical to the installed ones are listed in
`prebuilt/node_modules.json` rather than stored, and copied back from `node_modules` at startup; the files that
OpenNext patches are stored as is. Outside StackBlitz, `prebuilt/` is not used, unless you set `USE_PREBUILT=1`.
