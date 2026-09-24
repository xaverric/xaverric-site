import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS, STRICT_TRANSPORT_SECURITY } from "../src/http.js";
import { call, mockUpstream } from "./helpers.js";
import { vi } from "vitest";

afterEach(() => vi.restoreAllMocks());

const parseStaticHeaders = (text) =>
  Object.fromEntries(
    text
      .split("\n")
      .filter((line) => /^\s+\S+:/.test(line))
      .map((line) => {
        const [name, ...value] = line.trim().split(":");
        return [name.toLowerCase(), value.join(":").trim()];
      }),
  );

describe("security headers", () => {
  it("sets every security header on static assets", async () => {
    const response = await call("/");
    Object.entries(SECURITY_HEADERS).forEach(([name, value]) => expect(response.headers.get(name)).toBe(value));
    expect(response.headers.get("strict-transport-security")).toBe(STRICT_TRANSPORT_SECURITY);
  });

  it("sets them on API responses and not-found assets", async () => {
    mockUpstream();
    for (const path of ["/api/live", "/api/nope", "/missing-page"]) {
      const response = await call(path);
      expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  it("allows only same-origin resources and no inline script", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self';");
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-inline");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });

  it("keeps public/_headers in sync with the Worker", () => {
    const staticHeaders = parseStaticHeaders(env.TEST_STATIC_HEADERS);
    Object.entries(SECURITY_HEADERS).forEach(([name, value]) => expect(staticHeaders[name]).toBe(value));
    expect(staticHeaders["strict-transport-security"]).toBe(STRICT_TRANSPORT_SECURITY);
  });

  it("omits HSTS on plain http during local development", async () => {
    const response = await call("/", { origin: "http://localhost:8787" });
    expect(response.status).toBe(200);
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });

  it("answers HEAD without a body", async () => {
    const response = await call("/", { method: "HEAD" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });
});
