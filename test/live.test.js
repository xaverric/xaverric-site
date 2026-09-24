import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIVE_TTL_MS, UPSTREAM_TIMEOUT_MS, getLive, pickGithub, pickLeaderborder } from "../src/live.js";
import { GITHUB_URL, GITHUB_USER, ORIGIN, STATS, STATS_URL, call, mockUpstream, upstreamCalls } from "./helpers.js";

const CACHE_KEY = `${ORIGIN}/api/live`;
const T0 = Date.parse("2026-09-24T12:00:00Z");

const liveAt = async (now) => {
  const ctx = createExecutionContext();
  const response = await getLive(new Request(`${ORIGIN}/api/live`), {}, ctx, now);
  await waitOnExecutionContext(ctx);
  return response;
};

beforeEach(() => caches.default.delete(CACHE_KEY));
afterEach(() => vi.restoreAllMocks());

describe("field picking", () => {
  it("keeps only the public GitHub counters", () => {
    expect(pickGithub(GITHUB_USER)).toEqual({ login: "xaverric", publicRepos: 6, followers: 12, createdAt: "2016-05-02T10:43:50Z" });
  });

  it("keeps weekly leaderborder numbers when not suppressed", () => {
    expect(pickLeaderborder(STATS)).toEqual({
      tokensAllTime: 24_700_000_000,
      tokensThisWeek: 1_200_000,
      players: 5,
      activeThisWeek: 4,
      suppressed: false,
      minGroup: 3,
    });
  });

  it("drops weekly numbers when suppressed", () => {
    expect(pickLeaderborder({ ...STATS, suppressed: true, players: 2 })).toEqual({
      tokensAllTime: 24_700_000_000,
      tokensThisWeek: null,
      players: 2,
      activeThisWeek: null,
      suppressed: true,
      minGroup: 3,
    });
  });

  it("nulls values that are not non-negative integers", () => {
    expect(pickGithub({ login: "xaverric", public_repos: "6", followers: -1, created_at: "yesterday" })).toEqual({
      login: "xaverric",
      publicRepos: null,
      followers: null,
      createdAt: null,
    });
    expect(pickLeaderborder({ tokensAllTime: 1.5, players: null, suppressed: "no" })).toMatchObject({ tokensAllTime: null, players: null, suppressed: true });
  });
});

describe("GET /api/live", () => {
  it("returns the combined picked payload with a five minute browser cache", async () => {
    mockUpstream();
    const response = await call("/api/live");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["fetchedAt", "github", "leaderborder"]);
    expect(body.github).toEqual(pickGithub(GITHUB_USER));
    expect(body.leaderborder).toEqual(pickLeaderborder(STATS));
    expect(JSON.stringify(body)).not.toContain("private@example.com");
    expect(JSON.stringify(body)).not.toContain("costThisWeekUsd");
  });

  it("calls upstreams with a timeout signal and a user agent", async () => {
    const seen = [];
    mockUpstream({
      github: (request, init) => {
        seen.push({ signal: init?.signal, agent: request.headers.get("user-agent"), accept: request.headers.get("accept") });
        return Response.json(GITHUB_USER);
      },
      stats: (request, init) => {
        seen.push({ signal: init?.signal });
        return Response.json(STATS);
      },
    });
    await liveAt(T0);
    expect(seen).toHaveLength(2);
    seen.forEach(({ signal }) => expect(signal).toBeInstanceOf(AbortSignal));
    expect(seen[0].agent).toBe("xaverric-site");
    expect(seen[0].accept).toBe("application/vnd.github+json");
    expect(UPSTREAM_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });

  it("serves from cache for ten minutes, then refetches", async () => {
    const spy = mockUpstream();
    await liveAt(T0);
    await liveAt(T0 + LIVE_TTL_MS - 1000);
    expect(upstreamCalls(spy, GITHUB_URL)).toBe(1);
    expect(upstreamCalls(spy, STATS_URL)).toBe(1);
    await liveAt(T0 + LIVE_TTL_MS + 1000);
    expect(upstreamCalls(spy, GITHUB_URL)).toBe(2);
    expect(upstreamCalls(spy, STATS_URL)).toBe(2);
  });

  it("keeps the last good value of a source that fails", async () => {
    mockUpstream();
    await liveAt(T0);
    vi.restoreAllMocks();
    mockUpstream({ github: () => Response.json({ message: "rate limited" }, { status: 403 }), stats: () => Response.json({ ...STATS, players: 6 }) });
    const response = await liveAt(T0 + LIVE_TTL_MS + 1000);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.github).toEqual(pickGithub(GITHUB_USER));
    expect(body.leaderborder.players).toBe(6);
  });

  it("serves the stale payload when both upstreams fail", async () => {
    mockUpstream();
    const first = await (await liveAt(T0)).json();
    vi.restoreAllMocks();
    mockUpstream({ github: () => { throw new DOMException("timed out", "TimeoutError"); }, stats: () => new Response("down", { status: 502 }) });
    const response = await liveAt(T0 + LIVE_TTL_MS + 1000);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(first);
  });

  it("returns 503 with empty sources when nothing is cached and upstreams fail", async () => {
    mockUpstream({ github: () => new Response("down", { status: 500 }), stats: () => new Response("not json", { status: 200 }) });
    const response = await liveAt(T0);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ github: null, leaderborder: null, fetchedAt: null });
  });

  it("serves a partial payload when only one source answers", async () => {
    mockUpstream({ github: () => new Response("down", { status: 500 }) });
    const response = await liveAt(T0);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.github).toBeNull();
    expect(body.leaderborder.tokensAllTime).toBe(24_700_000_000);
    expect(body.fetchedAt).toBe(new Date(T0).toISOString());
  });
});
