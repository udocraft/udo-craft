import { describe, expect, it } from "vitest";
import { DEFAULT_HOME_LAYOUT, resolveHomeLayout } from "./home-layout";

const s = (id: string, visible = "true") => ({ id, visible });

describe("resolveHomeLayout", () => {
  it("falls back to the default 9 sections for missing or empty input", () => {
    expect(resolveHomeLayout(undefined)).toEqual([...DEFAULT_HOME_LAYOUT]);
    expect(resolveHomeLayout([])).toEqual([...DEFAULT_HOME_LAYOUT]);
    expect(resolveHomeLayout("nope")).toEqual([...DEFAULT_HOME_LAYOUT]);
  });

  it("maps the old 16-section layout onto 9 sections in order", () => {
    const legacy = [
      "hero", "social", "problems", "stats", "collections", "process", "box", "popup",
      "subscription", "designer", "customizer", "trust", "comparison", "faq", "cta", "contact",
    ].map((id) => s(id));
    expect(resolveHomeLayout(legacy)).toEqual([
      "hero", "proof", "why", "collections", "process", "services", "demo", "faq", "contact",
    ]);
  });

  it("places a merged section at its first visible source id", () => {
    expect(resolveHomeLayout([s("trust", "false"), s("hero"), s("comparison")])).toEqual(["hero", "why"]);
  });

  it("hides a merged section only when every source id is hidden", () => {
    expect(resolveHomeLayout([s("hero"), s("box", "false"), s("popup", "false")])).toEqual(["hero"]);
    expect(resolveHomeLayout([s("hero"), s("box", "false"), s("popup")])).toEqual(["hero", "services"]);
  });

  it("accepts boolean visibility and the admin placeholder id 'services'", () => {
    expect(resolveHomeLayout([{ id: "services", visible: true }, { id: "faq", visible: false }])).toEqual(["services"]);
  });

  it("ignores unknown ids and falls back when none are known", () => {
    expect(resolveHomeLayout([s("hero"), s("mystery")])).toEqual(["hero"]);
    expect(resolveHomeLayout([s("mystery"), null, 3])).toEqual([...DEFAULT_HOME_LAYOUT]);
  });

  it("respects a layout where the owner hid everything", () => {
    expect(resolveHomeLayout([s("hero", "false")])).toEqual([]);
  });
});
