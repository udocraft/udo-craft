import { expect, test } from "@playwright/test";
import { productPath } from "./helpers";

/** Plan.md Phase 5 "Reduced motion": nothing moves and content is still visible. */
test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

async function assertStill(page: import("@playwright/test").Page) {
  // Scroll through the page so scroll-triggered reveals would have started.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  const moving = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running" && Number(a.effect?.getComputedTiming().duration ?? 0) > 50)
      .map((a) => (a.effect as KeyframeEffect | null)?.target?.className?.toString().slice(0, 60) ?? "?"),
  );
  expect(moving, "animations still running with prefers-reduced-motion").toEqual([]);
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  expect(Number(await h1.evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
}

test("home is still and readable", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await assertStill(page);
  // The decorative background video must not play.
  expect(await page.evaluate(() => [...document.querySelectorAll("video")].filter((v) => !v.paused).length)).toBe(0);
});

test("product page is still and readable", async ({ page, request }) => {
  const path = await productPath(request);
  test.skip(!path, "no active product to test");
  await page.goto(path!, { waitUntil: "networkidle" });
  await assertStill(page);
});
