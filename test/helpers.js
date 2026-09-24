import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
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
