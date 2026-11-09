import { expect, test, type Page } from "@playwright/test";
import { productPath } from "./helpers";

test.use({ viewport: { width: 1280, height: 800 } });

/** Press Tab until `predicate` matches the focused element, or fail after `max` presses. */
async function tabUntil(page: Page, predicate: string, max = 25) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, predicate);
    if (hit) return i + 1;
  }
  throw new Error(`"${predicate}" not reached within ${max} Tab presses`);
}

test.describe("keyboard only", () => {
  test("skip link is the first stop and moves focus into <main>", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const skip = page.locator("a.skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    // Next Tab lands inside <main>, past the header.
    await page.keyboard.press("Tab");
    const inMain = await page.evaluate(() => !!document.activeElement?.closest("main"));
    expect(inMain).toBe(true);
  });

  test("header CTAs are reachable in a few Tab presses and show a focus ring", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Desktop header: the "design merch" CTA links to /order.
    const presses = await tabUntil(page, 'nav a[href$="/order"]', 12);
    expect(presses).toBeLessThanOrEqual(12);
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const s = getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth), boxShadow: s.boxShadow };
    });
    const visible = (outline.outlineStyle !== "none" && outline.outlineWidth >= 2) || outline.boxShadow !== "none";
    expect(visible, JSON.stringify(outline)).toBe(true);
  });

  test("FAQ <details> toggle with Enter and Space", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const first = page.locator("#faq details").first();
    const summary = first.locator("summary");
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("product card link shows a focus ring on the whole card", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const link = page.locator('#catalog a[href*="/products/"]').first();
    test.skip((await link.count()) === 0, "no products in the catalog");
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    const ring = await link.evaluate((el) => getComputedStyle(el, "::after").boxShadow);
    expect(ring, "stretched link must draw a visible ring on focus-visible").not.toBe("none");
  });

  test("product tabs follow the arrow-key pattern", async ({ page, request }) => {
    const path = await productPath(request);
    test.skip(!path, "no active product to test");
    await page.goto(path!, { waitUntil: "networkidle" });
    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.first()).toBeFocused();
    // Wrap-around, as implemented.
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.last()).toBeFocused();
    // Only the selected tab is in the Tab order (roving tabindex).
    await expect(tabs.first()).toHaveAttribute("tabindex", "-1");
    await expect(tabs.last()).toHaveAttribute("tabindex", "0");
  });
});
