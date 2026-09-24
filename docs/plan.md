# xaverric.cz - design spec and TDD plan

## Goal

Personal site of Daniel Jílek at https://xaverric.cz: who he is, the leaderborder project with live numbers, and a way to connect (GitHub, LinkedIn). One Cloudflare Worker with static assets, no build step, no framework.

## Design (Hallmark)

- Genre: editorial. Macrostructure: Marquee Hero (leaderborder used Stat-Led).
- Theme: custom, vibe "warm paper, hand-set type, one vermilion signal".
  - Paper `oklch(95.2% 0.014 78)`, ink `oklch(21% 0.016 55)`, accent `oklch(58% 0.205 34)`; dark paper `oklch(17.5% 0.012 55)`, dark accent `oklch(68% 0.18 36)`.
  - Fraunces (roman only, opsz + SOFT axes) for display and prose, JetBrains Mono for the technical register (nav, labels, data, command). Self-hosted, latin subset.
  - Axes: light / roman-serif / warm. Leaderborder was light / geometric-sans / cool-blue, so display style and accent hue differ.
- Nav N9 edge-aligned (leaderborder: N5). Footer Ft4 dense colophon (leaderborder: Ft5).
- Sections: hero (name fills the fold, positioning line) · about (run-in head, one paragraph) · work (project list rendered from `public/js/data/projects.js`, leaderborder only) · live strip (GitHub numbers) · connect (inverted band, two huge links) · colophon.
- Motion: staggered letter rise in the hero, CSS only · the acute accent over the "í" is a vermilion needle that turns toward the pointer · scroll-driven sweeps (`animation-timeline: view()`, static fallback). Transform and opacity only, everything off under `prefers-reduced-motion`.
- Enrichment: none (typography only), plus a small CSS flow diagram in the project block.

## Architecture

- `src/index.js`: www host redirects 301 to the apex, http redirects to https (except local), `/api/live` (GET/HEAD), other `/api/*` get a JSON 404, everything else goes to `env.ASSETS` (`run_worker_first = true`, `not_found_handling = "404-page"`). Security headers go on every response.
- `src/live.js`: fetches GitHub user + leaderborder stats with `AbortSignal.timeout`, picks the allowed fields (weekly numbers dropped when `suppressed`), caches the combined result in `caches.default`: fresh for 10 minutes, stale per source when an upstream fails, 503 only when nothing is cached. The response sends `Cache-Control: public, max-age=300`.
- `public/js/lib/*.js`: pure helpers (number formatting, years since, live view-model, needle angle).

## TDD plan

1. `test/http.test.js`: security headers on asset and API responses, `_headers` matches the Worker CSP, HSTS only on https.
2. `test/routing.test.js`: www redirect keeps path + query, http to https, unknown `/api/x` gives a 404 JSON, non-GET on `/api/live` gives a 405, assets pass through.
3. `test/live.test.js`: picks only the allowed fields, hides weekly numbers when suppressed, sends cache headers, serves from cache within 10 minutes, refetches after, keeps stale data per source on upstream failure, returns 503 when nothing is cached, sets the timeout signal.
4. `test/format.test.js`: `formatCompact`, `formatCount`, `yearsSince`, `liveView`, `needleAngle`.
5. Implement until green, `npm run lint`, then verify with `wrangler dev --local` and a browser (375/1280, light/dark, overflow at 320-768, Lighthouse).
