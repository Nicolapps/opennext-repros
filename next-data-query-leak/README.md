# `__nextDataReq` leaks into `context.query` for Pages Router data requests on OpenNext

[Open in StackBlitz](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/next-data-query-leak)

## What is wrong

On client-side navigations, the Pages Router fetches the props of a page from `/_next/data/<buildId>/<page>.json`.
OpenNext flags these requests internally with a `__nextDataReq=1` query param, and passes it on to Next.js
(`invokeQuery` and `req.url` in [`core/requestHandler.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/requestHandler.ts)),
so `getServerSideProps` sees a `__nextDataReq` key in `context.query` (and `router.query` gets it on the client).
On `next start`, the query of a data request is the same as the one of the document request.

| Request                                      | Expected (`next start`) | Actual (OpenNext)                           |
| -------------------------------------------- | ----------------------- | ------------------------------------------- |
| `GET /ssr?foo=bar`                           | `query = {"foo":"bar"}` | `query = {"foo":"bar"}`                     |
| `GET /_next/data/<buildId>/ssr.json?foo=bar` | `query = {"foo":"bar"}` | `query = {"foo":"bar","__nextDataReq":"1"}` |

## The repro

- `pages/ssr.tsx` — a page whose `getServerSideProps` returns `context.query` as a prop
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run)
- `compare.mjs` — requests the page and its data route on both servers (the build id is read from the page's
  `__NEXT_DATA__`), and reports the `query` prop
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
┌─────────┬──────────────────────────────────────────────┬─────────────────────────┬─────────────────────────────────────────────┬─────────────┐
│ (index) │ request                                      │ next start              │ OpenNext                                    │             │
├─────────┼──────────────────────────────────────────────┼─────────────────────────┼─────────────────────────────────────────────┼─────────────┤
│ 0       │ 'GET /ssr?foo=bar'                           │ 'query = {"foo":"bar"}' │ 'query = {"foo":"bar"}'                     │ 'same'      │
│ 1       │ 'GET /_next/data/<buildId>/ssr.json?foo=bar' │ 'query = {"foo":"bar"}' │ 'query = {"foo":"bar","__nextDataReq":"1"}' │ '≠ DIFFERS' │
└─────────┴──────────────────────────────────────────────┴─────────────────────────┴─────────────────────────────────────────────┴─────────────┘
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
