import { errorResponse, permanentRedirect, withSecurityHeaders } from "./http.js";
import { getLive } from "./live.js";

const APEX = "xaverric.cz";
const WWW = `www.${APEX}`;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const apexUrl = (url) => `https://${APEX}${url.pathname}${url.search}`;

const isApiPath = (pathname) => pathname === "/api" || pathname.startsWith("/api/");

const route = (request, env, ctx) => {
  const url = new URL(request.url);
  if (url.hostname === WWW) return permanentRedirect(apexUrl(url));
  if (url.protocol === "http:" && !LOCAL_HOSTS.has(url.hostname)) return permanentRedirect(apexUrl(url));
  if (!isApiPath(url.pathname)) return env.ASSETS.fetch(request);
  if (url.pathname !== "/api/live") return errorResponse(404, "not_found", "Not found");
  if (!["GET", "HEAD"].includes(request.method)) return errorResponse(405, "method_not_allowed", "Method not allowed", { allow: "GET, HEAD" });
  return getLive(request, env, ctx);
};

const safely = async (request, env, ctx) => {
  try {
    return await route(request, env, ctx);
  } catch (error) {
    console.error("Unhandled worker error", error?.name ?? "Error", error?.message ?? "");
    return errorResponse(500, "internal", "Internal error");
  }
};

export default {
  async fetch(request, env, ctx) {
    const secured = withSecurityHeaders(await safely(request, env, ctx), request);
    return request.method === "HEAD" ? new Response(null, secured) : secured;
  },
};
