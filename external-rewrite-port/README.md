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

| Request                | Expected (`next start`)       | Actual (OpenNext 4.1.5)     | With the proposed fix         |
| ---------------------- | ----------------------------- | --------------------------- | ----------------------------- |
| `GET /proxy/some/path` | `200 upstream got /some/path` | `500 Internal Server Error` | `200 upstream got /some/path` |
| `GET /proxy-fixed`     | `200 upstream got /fixed`     | `200 upstream got /fixed`   | `200 upstream got /fixed`     |

## The repro

- `next.config.ts` — the two rewrites: `/proxy/:path*` (with params) and `/proxy-fixed` (without, as a control)
- `upstream.mjs` — the destination of the rewrites: a tiny HTTP server on port 3002 that answers with the URL it got
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run).
  It also sets a minimal `proxyExternalRequest` override, because the default one only supports `https:` destinations;
  the 500 happens in the routing layer, before that override is called (the control request goes through it).
- `compare.mjs` — sends the same requests to the three servers and reports the status and body
- `app/page.tsx` — shows the comparison as a table

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5 (and 4.1.5 with the proposed fix, see below), Node 22.

## Run it

```sh
npm install
npm run repro
```

This builds the app with Next.js and OpenNext (`open-next build`), builds it again with the proposed fix of OpenNext
(`scripts/build-fixed.mjs`, see below), starts `next start` on http://localhost:3000, OpenNext 4.1.5 on
http://localhost:3001 and OpenNext + fix on http://localhost:3003, and prints the comparison. The same table is rendered at
http://localhost:3000/. The upstream server runs on http://localhost:3002.

```
┌─────────┬────────────────────────┬───────────────────────────────┬─────────────────────────────┬───────────────────────────────┬────────────────────────────────┐
│ (index) │ request                │ next start                    │ OpenNext 4.1.5              │ OpenNext + fix                │                                │
├─────────┼────────────────────────┼───────────────────────────────┼─────────────────────────────┼───────────────────────────────┼────────────────────────────────┤
│ 0       │ 'GET /proxy/some/path' │ '200 upstream got /some/path' │ '500 Internal Server Error' │ '200 upstream got /some/path' │ '≠ 4.1.5 differs, fix matches' │
│ 1       │ 'GET /proxy-fixed'     │ '200 upstream got /fixed'     │ '200 upstream got /fixed'   │ '200 upstream got /fixed'     │ 'same'                         │
└─────────┴────────────────────────┴───────────────────────────────┴─────────────────────────────┴───────────────────────────────┴────────────────────────────────┘
```

## The proposed fix

`vendor/opennextjs-aws-4.1.5-external-rewrite-host-port.tgz` is `@opennextjs/aws` 4.1.5 built from source with a proposed fix
applied (`pnpm pack` of the package: it differs from the published 4.1.5 only in `dist/core/routing/matcher.js`). The third
target of the comparison, "OpenNext + fix", is the same app built with it:

- `vendor/package.json` depends on the tarball. `scripts/build-fixed.mjs` installs it in `vendor/node_modules`
  (`npm install` in `vendor/`), then runs its `open-next build` with `open-next.fixed.config.ts`: the same
  configuration, except that `next build` is not run again, so that the three servers run the same Next.js build
  (same `BUILD_ID`). The output is `.open-next-fixed/`.
- `npm run build:fixed` runs only that step, on the `.next/` of a previous `npx open-next build`.

With the proposed fix, the rewrite with params reaches the upstream server like on `next start`.

## On StackBlitz: prebuilt output

StackBlitz runs Node in the browser (WebContainers), and neither build works there:

- `next build` fails while prerendering, with the WASM build of SWC that WebContainers use
  (`Error occurred prerendering page "/_global-error" … Invariant: Expected workStore to be initialized. This is a
  bug in Next.js.`). This is unrelated to OpenNext, and does not happen with a regular Node.
- `open-next build` needs native binaries: it imports `@ast-grep/napi` (a native addon with no WASM fallback
  published) and installs `sharp` for the image optimization function.

So on StackBlitz, `npm run repro` builds nothing: it uses the output of a local build, committed in `prebuilt/`
(`prebuilt/next/` is what `next start` needs from `.next/`, `prebuilt/open-next/` is `.open-next/`,
`prebuilt/open-next-fixed/` is `.open-next-fixed/`, all three from the same `next build`). *Running* them only needs JavaScript.

`prebuilt/` is regenerated with `npm run build:prebuilt` (`open-next build`, `scripts/build-fixed.mjs`, then
`scripts/prebuilt.mjs pack`). To keep it small, the webpack cache, standalone output and build traces of `.next/` are
left out; the files of the bundled `node_modules` of OpenNext that are identical to the installed ones are listed in
`prebuilt/node_modules.json` rather than stored, and copied back from `node_modules` at startup (the files that
OpenNext patches are stored as is); and the files of `.open-next-fixed/` that are identical to the ones of
`.open-next/` are listed in `prebuilt/open-next-fixed.json` rather than stored, and copied from there at startup (the
files that the fix changes are stored as is). Outside StackBlitz,
`prebuilt/` is not used, unless you set `USE_PREBUILT=1`.
