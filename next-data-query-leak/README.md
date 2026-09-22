# `__nextDataReq` leaks into `context.query` for Pages Router data requests on OpenNext

[Open in StackBlitz](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/next-data-query-leak)

## What is wrong

On client-side navigations, the Pages Router fetches the props of a page from `/_next/data/<buildId>/<page>.json`.
OpenNext flags these requests internally with a `__nextDataReq=1` query param, and passes it on to Next.js
(`invokeQuery` and `req.url` in [`core/requestHandler.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/requestHandler.ts)),
so `getServerSideProps` sees a `__nextDataReq` key in `context.query` (and `router.query` gets it on the client).
On `next start`, the query of a data request is the same as the one of the document request.

| Request                                      | Expected (`next start`) | Actual (OpenNext 4.1.5)                     | With the proposed fix   |
| -------------------------------------------- | ----------------------- | ------------------------------------------- | ----------------------- |
| `GET /ssr?foo=bar`                           | `query = {"foo":"bar"}` | `query = {"foo":"bar"}`                     | `query = {"foo":"bar"}` |
| `GET /_next/data/<buildId>/ssr.json?foo=bar` | `query = {"foo":"bar"}` | `query = {"foo":"bar","__nextDataReq":"1"}` | `query = {"foo":"bar"}` |

## The repro

- `pages/ssr.tsx` — a page whose `getServerSideProps` returns `context.query` as a prop
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run)
- `compare.mjs` — requests the page and its data route on the three servers (the build id is read from the page's
  `__NEXT_DATA__`), and reports the `query` prop
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
http://localhost:3000/.

```
┌─────────┬──────────────────────────────────────────────┬─────────────────────────┬─────────────────────────────────────────────┬─────────────────────────┬────────────────────────────────┐
│ (index) │ request                                      │ next start              │ OpenNext 4.1.5                              │ OpenNext + fix          │                                │
├─────────┼──────────────────────────────────────────────┼─────────────────────────┼─────────────────────────────────────────────┼─────────────────────────┼────────────────────────────────┤
│ 0       │ 'GET /ssr?foo=bar'                           │ 'query = {"foo":"bar"}' │ 'query = {"foo":"bar"}'                     │ 'query = {"foo":"bar"}' │ 'same'                         │
│ 1       │ 'GET /_next/data/<buildId>/ssr.json?foo=bar' │ 'query = {"foo":"bar"}' │ 'query = {"foo":"bar","__nextDataReq":"1"}' │ 'query = {"foo":"bar"}' │ '≠ 4.1.5 differs, fix matches' │
└─────────┴──────────────────────────────────────────────┴─────────────────────────┴─────────────────────────────────────────────┴─────────────────────────┴────────────────────────────────┘
```

## The proposed fix

`vendor/opennextjs-aws-4.1.5-next-data-query-leak.tgz` is `@opennextjs/aws` 4.1.5 built from source with a proposed fix
applied (`pnpm pack` of the package: it differs from the published 4.1.5 only in `dist/core/requestHandler.js`). The third
target of the comparison, "OpenNext + fix", is the same app built with it:

- `vendor/package.json` depends on the tarball. `scripts/build-fixed.mjs` installs it in `vendor/node_modules`
  (`npm install` in `vendor/`), then runs its `open-next build` with `open-next.fixed.config.ts`: the same
  configuration, except that `next build` is not run again, so that the three servers run the same Next.js build
  (same `BUILD_ID`). The output is `.open-next-fixed/`.
- `npm run build:fixed` runs only that step, on the `.next/` of a previous `npx open-next build`.

With the proposed fix, the query of the data request is the same as on `next start`.

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
