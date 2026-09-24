import { json } from "./http.js";

export const LIVE_TTL_MS = 10 * 60 * 1000;
export const UPSTREAM_TIMEOUT_MS = 4000;
export const RETRY_AFTER_FAILURE_MS = 60 * 1000;

const GITHUB_URL = "https://api.github.com/users/xaverric";
const STATS_URL = "https://leaderborder.xaverric.cz/api/public/stats";
const STORED_AT = "x-stored-at";
const EMPTY = { github: null, leaderborder: null, fetchedAt: null };

const count = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : null);

const isoDate = (value) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value)) ? value : null);

export const pickGithub = (data) => ({
  login: String(data.login ?? ""),
  publicRepos: count(data.public_repos),
  followers: count(data.followers),
  createdAt: isoDate(data.created_at),
});

export const pickLeaderborder = (data) => {
  const suppressed = data.suppressed !== false;
  return {
    tokensAllTime: count(data.tokensAllTime),
    tokensThisWeek: suppressed ? null : count(data.tokensThisWeek),
    players: count(data.players),
    activeThisWeek: suppressed ? null : count(data.activeThisWeek),
    suppressed,
    minGroup: count(data.minGroup),
  };
};

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers: { accept: "application/json", ...headers }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Upstream ${new URL(url).host} answered ${response.status}`);
  return response.json();
};

const githubHeaders = (env) => ({
  accept: "application/vnd.github+json",
  "user-agent": "xaverric-site",
  "x-github-api-version": "2022-11-28",
  ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
});

const fetchSources = (env) =>
  Promise.allSettled([
    fetchJson(GITHUB_URL, githubHeaders(env)).then(pickGithub),
    fetchJson(STATS_URL, { "user-agent": "xaverric-site" }).then(pickLeaderborder),
  ]);

const settledValue = (result, fallback) => (result.status === "fulfilled" ? result.value : fallback);

const toCacheEntry = (payload, storedAt) =>
  new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=86400", [STORED_AT]: String(storedAt) },
  });

const readCache = async (key) => {
  const cached = await caches.default.match(key);
  if (!cached) return null;
  return { payload: await cached.json(), storedAt: Number(cached.headers.get(STORED_AT)) || 0 };
};

const livePayload = (payload) => json(payload, { headers: { "cache-control": "public, max-age=300" } });

export const getLive = async (request, env, ctx, now = Date.now()) => {
  const key = new Request(new URL("/api/live", request.url).href);
  const cached = await readCache(key);
  if (cached && now - cached.storedAt < LIVE_TTL_MS) return livePayload(cached.payload);

  const [github, leaderborder] = await fetchSources(env);
  const fresh = github.status === "fulfilled" || leaderborder.status === "fulfilled";
  const stale = cached?.payload ?? EMPTY;
  if (!fresh) {
    if (!cached) return json(EMPTY, { status: 503 });
    ctx.waitUntil(caches.default.put(key, toCacheEntry(stale, now - LIVE_TTL_MS + RETRY_AFTER_FAILURE_MS)));
    return livePayload(stale);
  }

  const payload = {
    github: settledValue(github, stale.github),
    leaderborder: settledValue(leaderborder, stale.leaderborder),
    fetchedAt: new Date(now).toISOString(),
  };
  ctx.waitUntil(caches.default.put(key, toCacheEntry(payload, now)));
  return livePayload(payload);
};
