import { expect, test, type Page } from "@playwright/test";
import { productPath, seedCart } from "./helpers";

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

  test("checkout: empty submit focuses the first invalid field and names the error", async ({ page }) => {
    await seedCart(page, "contact");
    await page.goto("/order", { waitUntil: "networkidle" });
    await page.locator("aside button").filter({ hasText: /confirm/i }).click();
    const name = page.locator("#order-name");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#order-name-error")).toBeVisible();
  });

  test("checkout: delivery radios move with arrow keys; Nova Poshta city and branch by keyboard", async ({ page }) => {
    // Stub the lookup so the test does not depend on the carrier's API.
    await page.route("**/api/nova-poshta?**", (route) => {
      const isCity = route.request().url().includes("type=cities");
      return route.fulfill({ json: { options: [isCity ? { ref: "11111111-1111-4111-8111-111111111111", label: "Lviv" } : { ref: "w1", label: "Branch 1" }] } });
    });
    await seedCart(page, "contact");
    await page.goto("/order", { waitUntil: "networkidle" });

    const radios = page.locator('input[name="delivery"]');
    await radios.nth(0).focus();
    await page.keyboard.press("ArrowDown");
    await expect(radios.nth(1)).toBeChecked();
    await page.keyboard.press("ArrowUp");
    await expect(radios.nth(0)).toBeChecked();

    const lookup = page.locator('input[role="combobox"]');
    await lookup.fill("Lv");
    await expect(page.getByRole("option", { name: "Lviv" })).toBeVisible();
    await page.keyboard.press("Enter");
    // Branch list opens for the chosen city; the field takes focus by itself.
    await expect(lookup).toBeFocused();
    await lookup.fill("1");
    await expect(page.getByRole("option", { name: "Branch 1" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Lviv, Branch 1")).toBeVisible();
  });

  test("cart sheet: opens from the header, traps focus, Esc closes and returns focus", async ({ page }) => {
    await seedCart(page);
    await page.goto("/", { waitUntil: "networkidle" });
    const trigger = page.locator("nav button").filter({ has: page.locator("svg.lucide-shopping-bag") }).first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(/.+/);
    // Focus stays inside the dialog while tabbing.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      // Poll: base-ui moves focus through a guard element for a frame when it wraps.
      await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("mobile menu sheet: Esc closes and returns focus to the burger", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => localStorage.setItem("udo_consent", "denied"));
    await page.goto("/", { waitUntil: "networkidle" });
    const burger = page.locator("nav button[aria-expanded]").last();
    await burger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(burger).toBeFocused();
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
