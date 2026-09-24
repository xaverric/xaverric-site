export const CONTENT_SECURITY_POLICY = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'";

export const STRICT_TRANSPORT_SECURITY = "max-age=31536000";

export const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "content-security-policy": CONTENT_SECURITY_POLICY,
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
};

export const json = (data, { status = 200, headers = {} } = {}) =>
  Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });

export const errorResponse = (status, code, message, headers = {}) => json({ error: { code, message } }, { status, headers });

export const permanentRedirect = (location) => new Response(null, { status: 301, headers: { location, "cache-control": "public, max-age=3600" } });

export const withSecurityHeaders = (response, request) => {
  const secured = new Response(response.body, response);
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => secured.headers.set(name, value));
  if (new URL(request.url).protocol === "https:") secured.headers.set("strict-transport-security", STRICT_TRANSPORT_SECURITY);
  return secured;
};
