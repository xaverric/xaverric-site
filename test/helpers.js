import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { vi } from "vitest";
import worker from "../src/index.js";

export const ORIGIN = "https://xaverric.cz";

export const assets = {
  fetch: async (request) => {
    const { pathname } = new URL(request.url);
    const status = pathname === "/" || pathname.startsWith("/css/") ? 200 : 404;
    return new Response(`asset ${pathname}`, { status, headers: { "content-type": "text/html; charset=utf-8" } });
  },
};

export const makeEnv = (overrides = {}) => ({ ASSETS: assets, ...overrides });

export const call = async (path, { method = "GET", headers = {}, env, origin = ORIGIN } = {}) => {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(new URL(path, origin), { method, headers }), makeEnv(env), ctx);
  await waitOnExecutionContext(ctx);
  return response;
};

export const GITHUB_USER = {
  login: "xaverric",
  id: 19148363,
  name: "Daniel Jílek",
  email: "private@example.com",
  bio: "I am full-stack developer from Czech republic.",
  public_repos: 6,
  followers: 12,
  following: 24,
  created_at: "2016-05-02T10:43:50Z",
  html_url: "https://github.com/xaverric",
};

export const STATS = {
  tokensAllTime: 24_700_000_000,
  tokensThisWeek: 1_200_000,
  costThisWeekUsd: 12.5,
  players: 5,
  activeThisWeek: 4,
  topModels: [{ model: "x", tokens: 1 }],
  daily: [{ day: "2026-09-24", tokens: 0 }],
  suppressed: false,
  minGroup: 3,
  updatedAt: "2026-09-24T20:44:09.858Z",
};

export const GITHUB_URL = "https://api.github.com/users/xaverric";
export const STATS_URL = "https://leaderborder.xaverric.cz/api/public/stats";

export const mockUpstream = ({ github = () => Response.json(GITHUB_USER), stats = () => Response.json(STATS) } = {}) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    if (request.url === GITHUB_URL) return github(request, init);
    if (request.url === STATS_URL) return stats(request, init);
    return new Response("unexpected", { status: 599 });
  });

export const upstreamCalls = (spy, url) => spy.mock.calls.filter(([input]) => new Request(input).url === url).length;
