import { errorResponse, permanentRedirect, withSecurityHeaders } from "./http.js";

const APEX = "xaverric.cz";
const WWW = `www.${APEX}`;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const apexUrl = (url) => `https://${APEX}${url.pathname}${url.search}`;

const route = (request, env) => {
  const url = new URL(request.url);
  if (url.hostname === WWW) return permanentRedirect(apexUrl(url));
  if (url.protocol === "http:" && !LOCAL_HOSTS.has(url.hostname)) return permanentRedirect(apexUrl(url));
  return env.ASSETS.fetch(request);
};

const safely = async (request, env) => {
  try {
    return await route(request, env);
  } catch (error) {
    console.error("Unhandled worker error", error?.name ?? "Error", error?.message ?? "");
    return errorResponse(500, "internal", "Internal error");
  }
};

export default {
  async fetch(request, env) {
    const secured = withSecurityHeaders(await safely(request, env), request);
    return request.method === "HEAD" ? new Response(null, secured) : secured;
  },
};
