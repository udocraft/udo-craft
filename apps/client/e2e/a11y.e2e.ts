import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { STATIC_PAGES, VIEWPORTS, productPath } from "./helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** Plan.md Phase 5: 0 serious/critical. Lesser findings are attached, not failed. */
async function audit(page: import("@playwright/test").Page, testInfo: import("@playwright/test").TestInfo) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
  }));
  await testInfo.attach("axe-violations.json", { body: JSON.stringify(summary, null, 2), contentType: "application/json" });
  const blocking = summary.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  const minor = summary.filter((v) => !blocking.includes(v));
  if (minor.length) testInfo.annotations.push({ type: "axe-minor", description: minor.map((v) => `${v.id}(${v.impact})`).join(", ") });
}

for (const viewport of VIEWPORTS) {
  test.describe(`axe @ ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const { name, path } of STATIC_PAGES) {
      test(name, async ({ page }, testInfo) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await audit(page, testInfo);
      });
    }

    test("product page", async ({ page, request }, testInfo) => {
      const path = await productPath(request);
      test.skip(!path, "no active product to test");
      await page.goto(path!, { waitUntil: "networkidle" });
      await audit(page, testInfo);
    });
  });
}
