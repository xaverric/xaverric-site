# xaverric.cz

Personal site of Daniel Jílek, served at https://xaverric.cz by a Cloudflare Worker with static assets.

- `public/` is the site itself: one HTML page with a name and two links, plain CSS, no JavaScript, Geist self-hosted.
- `src/` is the Worker. It redirects `www.xaverric.cz` and plain http to `https://xaverric.cz` and hands every other path to the static assets (with `public/404.html` for unknown pages).
- Security headers (CSP with `default-src 'none'`, HSTS, nosniff, COOP/CORP) are set by the Worker and mirrored in `public/_headers`; a test keeps them in sync.
- `design/` holds the sources of `public/og.png` and the PNG icons.

## Local development

Requires Node 22.

```sh
npm install
npm run dev
```

`npm run dev` starts `wrangler dev` on http://localhost:8787. It needs no secrets.

```sh
npm run lint
npm test
```

Tests run in the Workers runtime through `@cloudflare/vitest-pool-workers` and cover the redirects, static routing and security headers.

## Deploy

Every push to `main` runs lint, audit and tests, then deploys with `wrangler deploy` in the GitHub environment `production`. The deploy job skips with a notice until the Cloudflare secrets exist. One-time setup is in [docs/DEPLOY.md](docs/DEPLOY.md).

Manual deploy from a machine that is logged in to Cloudflare:

```sh
npm run deploy
```
