# External rewrite to a `host:port` destination with params answers 500 on OpenNext

[Open in StackBlitz](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/external-rewrite-port)

## What is wrong

A rewrite to another origin whose destination has a port **and** uses params, such as

```ts
{ source: "/proxy/:path*", destination: "http://localhost:3002/:path*" }
```

works on `next start`, but answers `500 Internal Server Error` on OpenNext, which logs:

```
Error in routingHandler TypeError: Expected "3002" to be a string
```

`handleRewrites` ([`core/routing/matcher.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/routing/matcher.ts))
compiles the destination host, port included, with path-to-regexp, which parses `:3002` as a param named `3002`.
The same destination without params is not compiled, and works.

| Request                | Expected (`next start`)       | Actual (OpenNext)           |
| ---------------------- | ----------------------------- | --------------------------- |
| `GET /proxy/some/path` | `200 upstream got /some/path` | `500 Internal Server Error` |
| `GET /proxy-fixed`     | `200 upstream got /fixed`     | `200 upstream got /fixed`   |

## The repro

- `next.config.ts` — the two rewrites: `/proxy/:path*` (with params) and `/proxy-fixed` (without, as a control)
- `upstream.mjs` — the destination of the rewrites: a tiny HTTP server on port 3002 that answers with the URL it got
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run).
  It also sets a minimal `proxyExternalRequest` override, because the default one only supports `https:` destinations;
  the 500 happens in the routing layer, before that override is called (the control request goes through it).
- `compare.mjs` — sends the same requests to both servers and reports the status and body
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
http://localhost:3000/. The upstream server runs on http://localhost:3002.

```
┌─────────┬────────────────────────┬───────────────────────────────┬─────────────────────────────┬─────────────┐
│ (index) │ request                │ next start                    │ OpenNext                    │             │
├─────────┼────────────────────────┼───────────────────────────────┼─────────────────────────────┼─────────────┤
│ 0       │ 'GET /proxy/some/path' │ '200 upstream got /some/path' │ '500 Internal Server Error' │ '≠ DIFFERS' │
│ 1       │ 'GET /proxy-fixed'     │ '200 upstream got /fixed'     │ '200 upstream got /fixed'   │ 'same'      │
└─────────┴────────────────────────┴───────────────────────────────┴─────────────────────────────┴─────────────┘
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
