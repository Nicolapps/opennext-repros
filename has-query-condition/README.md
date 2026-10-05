# `has` / `missing` query conditions match when the query key is absent on OpenNext

## What is wrong

Redirects, rewrites and headers in `next.config.ts` can be restricted with
[`has` and `missing` conditions](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects#header-cookie-and-query-matching).
For a condition of type `query` without a `value`, Next.js checks that the query key is present. OpenNext's
`routeHasMatcher` ([`core/routing/matcher.ts`](https://github.com/opennextjs/opennextjs-aws/blob/main/packages/open-next/src/core/routing/matcher.ts))
tests the value against an empty regex even when the key is absent, so such a condition always matches:

- a rule with `has: [{ type: "query", key: "preview" }]` also applies when `preview` is absent;
- a rule with `missing: [{ type: "query", key: "preview" }]` never applies.

| `npm run check`          | `next/` (expected)         | `opennext/` (4.1.5)        | `opennext-patched/`        |
| ------------------------ | -------------------------- | -------------------------- | -------------------------- |
| `GET /has`               | `200`                      | **`307 → /matched`**       | `200`                      |
| `GET /has?preview=1`     | `307 → /matched?preview=1` | `307 → /matched?preview=1` | `307 → /matched?preview=1` |
| `GET /missing`           | `307 → /matched`           | **`200`**                  | `307 → /matched`           |
| `GET /missing?preview=1` | `200`                      | `200`                      | `200`                      |

## Layout

The same minimal app, three times. The app source is identical in the three folders; they only differ in
`package.json` (dependencies and scripts), in the lockfile, and in the OpenNext-only files.

| Folder | What it runs | Result |
| ------ | ------------ | ------ |
| [`next/`](./next) | Next.js (`next build`, `next start`) | expected |
| [`opennext/`](./opennext) | `@opennextjs/aws` 4.1.5, as a [local Node server](https://opennext.js.org/aws/contribute/local_run) | the bug |
| [`opennext-patched/`](./opennext-patched) | the same, with the patched `@opennextjs/aws` ([pkg.pr.new](https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@ac8220b) preview of the fix) | same as `next/` |

- `next.config.ts` — two redirects to `/matched`: `/has` (with a `has` query condition) and `/missing` (with a `missing` one)
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

`next` 16.3.5 (webpack build), `@opennextjs/aws` 4.1.5, Node 22.

## The fix

[`fix/has-query-missing-key`](https://github.com/Nicolapps/opennextjs-aws/tree/fix/has-query-missing-key)
([diff](https://github.com/Nicolapps/opennextjs-aws/pull/1/files)).
`opennext-patched/` installs the [pkg.pr.new](https://pkg.pr.new) preview of that branch at commit `ac8220b`:
`https://pkg.pr.new/Nicolapps/opennextjs-aws/@opennextjs/aws@ac8220b`.
To try another build of the fix, change the
`"@opennextjs/aws"` line of `opennext-patched/package.json`: see the [README at the root](../README.md#the-patched-opennextjsaws).
