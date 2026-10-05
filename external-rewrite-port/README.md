# External rewrite to a `host:port` destination with params answers 500 on OpenNext

## What is wrong

A rewrite to another origin whose destination has a port **and** uses params, such as

```ts
{ source: "/proxy/:path*", destination: "http://localhost:3002/:path*" }
```

works on Next.js, but answers `500 Internal Server Error` on OpenNext, which logs:

```
Error in routingHandler TypeError: Expected "3002" to be a string
```

`handleRewrites` ([`core/routing/matcher.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/routing/matcher.ts))
compiles the destination host, port included, with path-to-regexp, which parses `:3002` as a param named `3002`.
The same destination without params is not compiled, and works.

| `npm run check`        | `next/` (expected)            | `opennext/` (4.1.5)             | `opennext-patched/`           |
| ---------------------- | ----------------------------- | ------------------------------- | ----------------------------- |
| `GET /proxy/some/path` | `200 upstream got /some/path` | **`500 Internal Server Error`** | `200 upstream got /some/path` |
| `GET /proxy-fixed`     | `200 upstream got /fixed`     | `200 upstream got /fixed`       | `200 upstream got /fixed`     |

## Layout

The same minimal app, three times. The app source is identical in the three folders; they only differ in
`package.json` (dependencies and scripts), in the lockfile, and in the OpenNext-only files.

| Folder | What it runs | Result |
| ------ | ------------ | ------ |
| [`next/`](./next) | Next.js (`next build`, `next start`) | expected |
| [`opennext/`](./opennext) | `@opennextjs/aws` 4.1.5, as a [local Node server](https://opennext.js.org/aws/contribute/local_run) | the bug |
| [`opennext-patched/`](./opennext-patched) | the same, with the patched `@opennextjs/aws` ([pkg.pr.new](https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@934d978) preview of the fix) | same as `next/` |

- `next.config.ts` — the two rewrites: `/proxy/:path*` (with params) and `/proxy-fixed` (without, as a control)
- `upstream.mjs` — the destination of the rewrites: a tiny HTTP server that answers with the URL it got
- `check.mjs` (`npm run check`) — sends the requests above, and reports the status and body
- `open-next.config.ts` (OpenNext copies) — also sets a minimal `proxyExternalRequest` override, because the default one only supports `https:` destinations; the 500 happens in the routing layer, before that override is called (the control request goes through it)
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
`npm start` also runs `upstream.mjs` (the destination of the rewrites) on port 3002 (`UPSTREAM_PORT`, read at build time too).

## Versions

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## The fix

[`fix/external-rewrite-host-port`](https://github.com/Nicolapps/opennextjs-aws/tree/fix/external-rewrite-host-port)
([diff](https://github.com/Nicolapps/opennextjs-aws/pull/3/files)).
`opennext-patched/` installs the [pkg.pr.new](https://pkg.pr.new) preview of that branch at commit `934d978`:
`https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@934d978`.
To try another build of the fix, change the
`"@opennextjs/aws"` line of `opennext-patched/package.json`: see the [README at the root](../README.md#the-patched-opennextjsaws).
