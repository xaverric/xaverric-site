import { afterEach, describe, expect, it, vi } from "vitest";
import { call, mockUpstream } from "./helpers.js";

afterEach(() => vi.restoreAllMocks());

describe("hosts", () => {
  it("redirects www to the apex with path and query", async () => {
    const response = await call("/work/?ref=card", { origin: "https://www.xaverric.cz" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://xaverric.cz/work/?ref=card");
  });

  it("redirects www API calls too", async () => {
    const spy = mockUpstream();
    const response = await call("/api/live", { origin: "http://www.xaverric.cz" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://xaverric.cz/api/live");
    expect(spy).not.toHaveBeenCalled();
  });

  it("upgrades plain http on the apex", async () => {
    const response = await call("/about?x=1", { origin: "http://xaverric.cz" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://xaverric.cz/about?x=1");
  });

  it("serves local development over http", async () => {
    for (const origin of ["http://localhost:8787", "http://127.0.0.1:8787"]) {
      expect((await call("/", { origin })).status).toBe(200);
    }
  });
});

describe("routes", () => {
  it("passes other paths to static assets", async () => {
    const response = await call("/css/site.css");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset /css/site.css");
  });

  it("keeps the asset 404 for unknown pages", async () => {
    expect((await call("/no-such-page")).status).toBe(404);
  });

  it("answers unknown API paths with a JSON 404", async () => {
    for (const path of ["/api", "/api/", "/api/nope", "/api/live/extra"]) {
      const response = await call(path);
      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toEqual({ error: { code: "not_found", message: "Not found" } });
    }
  });

  it("allows only GET and HEAD on /api/live", async () => {
    const response = await call("/api/live", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });
});
