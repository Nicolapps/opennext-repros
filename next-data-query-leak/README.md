# `__nextDataReq` leaks into `context.query` for Pages Router data requests on OpenNext

## What is wrong

On client-side navigations, the Pages Router fetches the props of a page from `/_next/data/<buildId>/<page>.json`.
OpenNext flags these requests internally with a `__nextDataReq=1` query param, and passes it on to Next.js
(`invokeQuery` and `req.url` in [`core/requestHandler.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/requestHandler.ts)),
so `getServerSideProps` sees a `__nextDataReq` key in `context.query` (and `router.query` gets it on the client).
On Next.js, the query of a data request is the same as the one of the document request.

| `npm run check`                              | `next/` (expected)      | `opennext/` (4.1.5)                             | `opennext-patched/`     |
| -------------------------------------------- | ----------------------- | ----------------------------------------------- | ----------------------- |
| `GET /ssr?foo=bar`                           | `query = {"foo":"bar"}` | `query = {"foo":"bar"}`                         | `query = {"foo":"bar"}` |
| `GET /_next/data/<buildId>/ssr.json?foo=bar` | `query = {"foo":"bar"}` | **`query = {"foo":"bar","__nextDataReq":"1"}`** | `query = {"foo":"bar"}` |

## Layout

The same minimal app, three times. The app source is identical in the three folders; they only differ in
`package.json` (dependencies and scripts), in the lockfile, and in the OpenNext-only files.

| Folder | What it runs | Result |
| ------ | ------------ | ------ |
| [`next/`](./next) | Next.js (`next build`, `next start`) | expected |
| [`opennext/`](./opennext) | `@opennextjs/aws` 4.1.5, as a [local Node server](https://opennext.js.org/aws/contribute/local_run) | the bug |
| [`opennext-patched/`](./opennext-patched) | the same, with the patched `@opennextjs/aws` ([pkg.pr.new](https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@97b8872) preview of the fix) | same as `next/` |

- `pages/ssr.tsx` — a page whose `getServerSideProps` returns `context.query` as a prop
- `check.mjs` (`npm run check`) — requests the page and its data route (the build id is read from the `__NEXT_DATA__` of the page), and reports the `query` prop
- `open-next.config.ts` (OpenNext copies) — runs OpenNext as a local Node server (`express-dev` wrapper, `fs-dev` caches)

## Run it

In any of the three folders:

```sh
npm install
npm run build
npm start          # the server, on http://localhost:3000
```

and in another terminal, in the same folder:

```sh
npm run check      # sends the requests to http://localhost:3000 (or SERVER_URL) and prints the results
```

Run one folder at a time: they use the same port (`PORT`, default 3000).

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## The fix

[`fix/next-data-query-leak`](https://github.com/Nicolapps/opennextjs-aws/tree/fix/next-data-query-leak)
([diff](https://github.com/Nicolapps/opennextjs-aws/pull/4/files)).
`opennext-patched/` installs the [pkg.pr.new](https://pkg.pr.new) preview of that branch at commit `97b8872`:
`https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@97b8872`.
To try another build of the fix, change the
`"@opennextjs/aws"` line of `opennext-patched/package.json`: see the [README at the root](../README.md#the-patched-opennextjsaws).
