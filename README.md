# xaverric.cz

Personal site of Daniel Jílek, served at https://xaverric.cz by a Cloudflare Worker with static assets.

- `public/` is the site itself: plain HTML, CSS and ES modules, no build step, fonts self-hosted.
- `public/js/data/projects.js` lists the projects shown under Work. Add an entry there to show another project; `live: "leaderborder"` attaches the live leaderborder numbers.
- `src/` is the Worker. It redirects `www.xaverric.cz` and plain http to `https://xaverric.cz`, serves `GET /api/live` and hands every other path to the static assets (with `public/404.html` for unknown pages).
- `GET /api/live` fetches the public GitHub profile of `xaverric` and `https://leaderborder.xaverric.cz/api/public/stats` on the server, keeps only the public counters (weekly leaderborder numbers are dropped while they are suppressed), caches the result for ten minutes and falls back to the last good value when an upstream fails.
- Security headers (CSP with `default-src 'none'`, HSTS, nosniff, COOP/CORP) are set by the Worker and mirrored in `public/_headers`; a test keeps them in sync.
- `design/` holds the sources of `public/og.png` and the PNG icons.

## Local development

Requires Node 22.

```sh
npm install
npm run dev
```

`npm run dev` starts `wrangler dev` on http://localhost:8787. It needs no secrets; `/api/live` calls the real upstream APIs.

```sh
npm run lint
npm test
```

Tests run in the Workers runtime through `@cloudflare/vitest-pool-workers` and cover the Worker routes, the live endpoint (field picking, caching, upstream failure) and the front-end helpers in `public/js/lib/`.

## Deploy

Every push to `main` runs lint, audit and tests, then deploys with `wrangler deploy` in the GitHub environment `production`. The deploy job skips with a notice until the Cloudflare secrets exist. One-time setup is in [docs/DEPLOY.md](docs/DEPLOY.md).

Manual deploy from a machine that is logged in to Cloudflare:

```sh
npm run deploy
```
