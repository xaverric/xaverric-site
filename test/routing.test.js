import { describe, expect, it } from "vitest";
import { call } from "./helpers.js";

describe("hosts", () => {
  it("redirects www to the apex with path and query", async () => {
    const response = await call("/work/?ref=card", { origin: "https://www.xaverric.cz" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://xaverric.cz/work/?ref=card");
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

  it("serves no API anymore", async () => {
    for (const path of ["/api", "/api/live"]) expect((await call(path)).status).toBe(404);
  });
});
