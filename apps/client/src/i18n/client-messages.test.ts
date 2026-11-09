import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_CLIENT_NAMESPACES, CABINET_NAMESPACES, pickMessages } from "./client-messages";

const SRC = join(__dirname, "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx|ts)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
}

/** Routes whose layout adds CABINET_NAMESPACES to the base set. */
const CABINET_ROUTES = ["app/[locale]/cabinet/", "app/[locale]/order/"];

describe("client message namespaces", () => {
  const usages = walk(SRC).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    if (!text.includes("useTranslations(")) return [];
    return [...text.matchAll(/useTranslations\(\s*["'`]([\w.]+)["'`]\s*\)/g)].map((m) => ({
      file: relative(SRC, file),
      namespace: m[1].split(".")[0],
    }));
  });

  it("finds the client usages (guards against a broken scan)", () => {
    expect(usages.length).toBeGreaterThan(10);
  });

  it("every useTranslations namespace is shipped to the route that renders it", () => {
    const missing = usages.filter(({ file, namespace }) => {
      if ((BASE_CLIENT_NAMESPACES as readonly string[]).includes(namespace)) return false;
      if ((CABINET_NAMESPACES as readonly string[]).includes(namespace)) {
        return !CABINET_ROUTES.some((r) => file.startsWith(r));
      }
      return true;
    });
    expect(missing).toEqual([]);
  });

  it("pickMessages keeps only the requested namespaces", () => {
    expect(pickMessages({ a: { x: "1" }, b: { y: "2" } }, ["a", "zzz"])).toEqual({ a: { x: "1" } });
  });
});
