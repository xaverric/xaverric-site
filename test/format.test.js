import { describe, expect, it } from "vitest";
import { formatCompact, formatCount, liveView, needleAngle, yearsSince } from "../public/js/lib/format.js";

describe("formatCompact", () => {
  it("shortens large numbers with one decimal", () => {
    expect(formatCompact(24_700_000_000)).toBe("24.7B");
    expect(formatCompact(1_000_000)).toBe("1M");
    expect(formatCompact(1_250_000)).toBe("1.3M");
    expect(formatCompact(12_345)).toBe("12.3K");
    expect(formatCompact(3_200_000_000_000)).toBe("3.2T");
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(0)).toBe("0");
  });

  it("rolls up to the next unit instead of printing 1000K", () => {
    expect(formatCompact(999_960)).toBe("1M");
  });

  it("returns null for anything that is not a count", () => {
    [null, undefined, -1, Number.NaN, "5"].forEach((value) => expect(formatCompact(value)).toBeNull());
  });
});

describe("formatCount", () => {
  it("groups digits with commas", () => {
    expect(formatCount(24_700_000_000)).toBe("24,700,000,000");
    expect(formatCount(6)).toBe("6");
    expect(formatCount(null)).toBeNull();
  });
});

describe("yearsSince", () => {
  it("counts full years", () => {
    const now = Date.parse("2026-09-24T12:00:00Z");
    expect(yearsSince("2016-05-02T10:43:50Z", now)).toBe(10);
    expect(yearsSince("2016-09-25T00:00:00Z", now)).toBe(9);
    expect(yearsSince("not a date", now)).toBeNull();
    expect(yearsSince(null, now)).toBeNull();
  });
});

describe("liveView", () => {
  const now = Date.parse("2026-09-24T12:00:00Z");
  const payload = {
    github: { login: "xaverric", publicRepos: 6, followers: 12, createdAt: "2016-05-02T10:43:50Z" },
    leaderborder: { tokensAllTime: 24_700_000_000, tokensThisWeek: null, players: 2, activeThisWeek: null, suppressed: true, minGroup: 3 },
    fetchedAt: "2026-09-24T11:58:00Z",
  };

  it("maps the API payload to display strings", () => {
    expect(liveView(payload, now)).toEqual({
      github: { publicRepos: "6", followers: "12", years: "10", since: "2016" },
      leaderborder: { tokensAllTime: "24.7B", tokensAllTimeFull: "24,700,000,000", players: "2", tokensThisWeek: null, activeThisWeek: null, suppressed: true, minGroup: "3" },
    });
  });

  it("shows weekly numbers when they are public", () => {
    const open = { ...payload, leaderborder: { ...payload.leaderborder, suppressed: false, tokensThisWeek: 1_200_000, activeThisWeek: 4 } };
    expect(liveView(open, now).leaderborder).toMatchObject({ tokensThisWeek: "1.2M", activeThisWeek: "4", suppressed: false });
  });

  it("keeps missing sources null", () => {
    expect(liveView({ github: null, leaderborder: null }, now)).toEqual({ github: null, leaderborder: null });
    expect(liveView(null, now)).toEqual({ github: null, leaderborder: null });
  });
});

describe("needleAngle", () => {
  it("points straight up when the pointer is above", () => {
    expect(needleAngle({ x: 100, y: 0 }, { x: 100, y: 100 })).toBe(0);
  });

  it("leans toward the pointer and clamps", () => {
    expect(needleAngle({ x: 200, y: 0 }, { x: 100, y: 100 })).toBe(45);
    expect(needleAngle({ x: 0, y: 0 }, { x: 100, y: 100 })).toBe(-45);
    expect(needleAngle({ x: 400, y: 100 }, { x: 100, y: 100 })).toBe(60);
    expect(needleAngle({ x: 100, y: 400 }, { x: 100, y: 100 }, 60)).toBe(60);
    expect(needleAngle({ x: -300, y: 300 }, { x: 100, y: 100 }, 60)).toBe(-60);
  });
});
