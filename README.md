# OpenNext repros

Minimal reproductions of behaviour differences between Next.js (`next start`) and the same app built with
[OpenNext](https://opennext.js.org/aws) (`@opennextjs/aws`), running as a local Node server. Each repro compares three
targets: `next start`, OpenNext 4.1.5, and OpenNext 4.1.5 with a proposed fix (built from source, checked in as a
tarball in the `vendor/` folder of the repro).

| Repro | What differs on OpenNext 4.1.5 | With the proposed fix | StackBlitz |
| ----- | ------------------------------ | --------------------- | ---------- |
| [`has-query-condition`](./has-query-condition) | `has` / `missing` conditions of type `query` (without `value`) match when the query key is absent. | matches `next start` | [pinned](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/66e5c7322ee0/has-query-condition) · [main](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/has-query-condition) |
| [`trailing-slash-api`](./trailing-slash-api) | `trailingSlash: true` is not applied to `/api/*` routes. | matches `next start` | [pinned](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/66e5c7322ee0/trailing-slash-api) · [main](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/trailing-slash-api) |
| [`external-rewrite-port`](./external-rewrite-port) | An external rewrite with params to a `host:port` destination answers 500. | matches `next start` | [pinned](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/66e5c7322ee0/external-rewrite-port) · [main](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/external-rewrite-port) |
| [`next-data-query-leak`](./next-data-query-leak) | Pages Router: `__nextDataReq` leaks into `context.query` for `/_next/data/…` requests. | matches `next start` | [pinned](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/66e5c7322ee0/next-data-query-leak) · [main](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/next-data-query-leak) |
| [`isr-double-revalidation`](./isr-double-revalidation) | A stale ISR page (Pages Router) is regenerated twice. | still 2 renders (see the README) | [pinned](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/66e5c7322ee0/isr-double-revalidation) · [main](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/isr-double-revalidation) |
| [`revalidate-tag-stale-fetch`](./revalidate-tag-stale-fetch) | A cached `fetch` without `next.revalidate` is never refreshed after `revalidateTag(tag, "max")`. | matches `next start` | [pinned](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/66e5c7322ee0/revalidate-tag-stale-fetch) · [main](https://stackblitz.com/github/Nicolapps/opennext-repros/tree/main/revalidate-tag-stale-fetch) |

## Layout

One folder per repro. Each folder is a self-contained Next.js app (nothing is shared between folders), with the same
structure:

- `README.md` — what is wrong, expected (`next start`) vs actual (OpenNext), versions
- `npm run repro` (`scripts/repro.mjs`) — builds the app with Next.js and with OpenNext 4.1.5, builds it again with
  the fixed OpenNext, starts `next start` on port 3000, OpenNext 4.1.5 on port 3001 and OpenNext + fix on port 3003
  (plus a helper server on port 3002 for some repros), and prints a comparison table:
  request | `next start` | OpenNext 4.1.5 | OpenNext + fix. Rows where 4.1.5 differs from `next start` are flagged,
  with whether the fixed build matches `next start`.
- `compare.mjs` — the requests of the comparison; `app/page.tsx` renders the same table at http://localhost:3000/
- `open-next.config.ts` — runs OpenNext as a [local Node server](https://opennext.js.org/aws/contribute/local_run)
- `vendor/opennextjs-aws-4.1.5-<fix>.tgz` — `@opennextjs/aws` 4.1.5 with the proposed fix, built from source
  (`pnpm pack`; each tarball differs from the published 4.1.5 only in the files of the fix, listed in the README of
  the repro). `scripts/build-fixed.mjs` (`npm run build:fixed`) installs it in `vendor/node_modules` and builds
  `.open-next-fixed/` from the `.next/` of the first build (`open-next.fixed.config.ts` skips `next build`), so that
  the three servers run the same Next.js build.
- `prebuilt/` — the output of `next build` and of both `open-next build`, only used on StackBlitz (see below)

## StackBlitz

A folder opens in StackBlitz with `https://stackblitz.com/github/Nicolapps/opennext-repros/tree/<commit-or-branch>/<folder>`,
which runs `npm install && npm run repro`. The "pinned" links above use commit `66e5c7322ee0`.

StackBlitz runs Node in the browser (WebContainers), where neither build works: `next build` fails while prerendering
with the WASM build of SWC (`Invariant: Expected workStore to be initialized. This is a bug in Next.js.`, unrelated to
OpenNext), and `open-next build` needs native binaries (`@ast-grep/napi`, which has no WASM fallback, and an
`npm install` of `sharp`). So on StackBlitz, `npm run repro` builds nothing: the three servers run from the output of a local
build, committed in `prebuilt/` (regenerated with `npm run build:prebuilt`). Locally, `npm run repro` always builds from
scratch, and `prebuilt/` is not used.
