import { describe, it, expect } from "vitest";
import { parseCspReports } from "./csp-report";

describe("parseCspReports", () => {
  it("parses legacy application/csp-report", () => {
    const raw = JSON.stringify({
      "csp-report": {
        "document-uri": "https://u-do-craft.store/",
        "violated-directive": "script-src-elem",
        "effective-directive": "script-src-elem",
        "blocked-uri": "https://evil.test/x.js",
        "line-number": 7,
      },
    });
    expect(parseCspReports(raw)).toEqual([
      { directive: "script-src-elem", blocked: "https://evil.test/x.js", document: "https://u-do-craft.store/", source: "", line: 7, disposition: "" },
    ]);
  });

  it("parses application/reports+json arrays and ignores other report types", () => {
    const raw = JSON.stringify([
      { type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "http://x.test/a.png", documentURL: "https://u-do-craft.store/", disposition: "report" } },
      { type: "deprecation", body: { id: "x" } },
    ]);
    const out = parseCspReports(raw);
    expect(out).toHaveLength(1);
    expect(out[0].directive).toBe("img-src");
    expect(out[0].blocked).toBe("http://x.test/a.png");
  });

  it("returns [] for junk and truncates long fields", () => {
    expect(parseCspReports("not json")).toEqual([]);
    expect(parseCspReports("null")).toEqual([]);
    const long = "a".repeat(5000);
    const out = parseCspReports(JSON.stringify({ "csp-report": { "effective-directive": "x", "blocked-uri": long } }));
    expect(out[0].blocked.length).toBe(300);
  });
});
