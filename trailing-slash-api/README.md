# `trailingSlash: true` is not applied to `/api/*` routes on OpenNext

## What is wrong

With `trailingSlash: true` in `next.config.ts`, Next.js redirects every path without a trailing slash to the one
with a trailing slash — API routes included. OpenNext skips that redirect for any path starting with `/api/`
([`handleTrailingSlashRedirect` in `core/routing/matcher.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/routing/matcher.ts)).

| `npm run check`   | `next/` (expected)  | `opennext/` (4.1.7) | `opennext-patched/` |
| ----------------- | ------------------- | ------------------- | ------------------- |
| `GET /api/hello`  | `308 → /api/hello/` | **`200`**           | `308 → /api/hello/` |
| `GET /api/hello/` | `200`               | `200`               | `200`               |
| `GET /page`       | `308 → /page/`      | `308 → /page/`      | `308 → /page/`      |
| `GET /page/`      | `200`               | `200`               | `200`               |

## Layout

The same minimal app, three times. The app source is identical in the three folders; they only differ in
`package.json` (dependencies and scripts), in the lockfile, and in the OpenNext-only files.

| Folder | What it runs | Result |
| ------ | ------------ | ------ |
| [`next/`](./next) | Next.js (`next build`, `next start`) | expected |
| [`opennext/`](./opennext) | `@opennextjs/aws` 4.1.7, as a [local Node server](https://opennext.js.org/aws/contribute/local_run) | the bug |
| [`opennext-patched/`](./opennext-patched) | the same, with the patched `@opennextjs/aws` ([pkg.pr.new](https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@5abb421) preview of the fix) | same as `next/` |

- `next.config.ts` — `trailingSlash: true`
- `app/api/hello/route.ts` — the API route; `app/page/page.tsx` — a regular page, as a control
- `check.mjs` (`npm run check`) — sends the requests above, without following redirects
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

`next` 16.3.8 (webpack build), `@opennextjs/aws` 4.1.7, Node 22.

## The fix

[`fix/trailing-slash-api`](https://github.com/Nicolapps/opennextjs-aws/tree/fix/trailing-slash-api)
([diff](https://github.com/Nicolapps/opennextjs-aws/pull/2/files)).
`opennext-patched/` installs the [pkg.pr.new](https://pkg.pr.new) preview of that branch at commit `5abb421`:
`https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@5abb421`.
To try another build of the fix, change the
`"@opennextjs/aws"` line of `opennext-patched/package.json`: see the [README at the root](../README.md#the-patched-opennextjsaws).
