import { expect, test } from "@playwright/test";
import { seedCart } from "./helpers";

/**
 * Plan.md Phase 5 "Visual": no horizontal overflow at 375 / 768 / 1280 in en, uk and de
 * (de has the longest strings). A full-page screenshot is attached to each test for review;
 * there is no pixel baseline, so layout changes do not fail the run.
 */
const WIDTHS = [375, 768, 1280] as const;
const PAGES = [
  { name: "home en", path: "/" },
  { name: "home uk", path: "/uk" },
  { name: "home de", path: "/de" },
  { name: "privacy de", path: "/de/privacy" },
  { name: "order de", path: "/de/order" },
  { name: "checkout de", path: "/de/order", checkout: true },
  { name: "cart de", path: "/de/cart", cart: true },
] as const;

for (const width of WIDTHS) {
  test.describe(`layout @ ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const p of PAGES) {
      test(p.name, async ({ page }, testInfo) => {
        if ("checkout" in p) await seedCart(page, "contact");
        else if ("cart" in p) await seedCart(page);
        else await page.addInitScript(() => localStorage.setItem("udo_consent", "denied"));
        await page.goto(p.path, { waitUntil: "networkidle" });
        await testInfo.attach(`${p.name}-${width}.png`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const wide = [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1 && getComputedStyle(el).position !== "fixed" && !el.closest("[aria-hidden='true'], .overflow-x-auto, .overflow-hidden"))
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
          return { scroll: doc.scrollWidth - doc.clientWidth, wide };
        });
        expect(overflow.scroll, `page scrolls sideways; widest: ${overflow.wide.join(" | ")}`).toBeLessThanOrEqual(1);
      });
    }
  });
}
