import { test, expect } from "@playwright/test";

const pages = [
  ["home", "/"],
  ["catalog", "/catalogo"],
  ["product", "/postres/pie-limon"],
  ["account", "/cuenta"],
  ["privacy", "/privacidad"],
  ["payment-result", "/pago/resultado"],
] as const;

test.describe("shared page design", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Explicit viewports cover both screen sizes.");
  });

  for (const width of [320, 390, 760, 1024, 1440]) {
    for (const [name, path] of pages) {
      test(`${name} fits ${width}px and loads fonts from the site`, async ({ page }) => {
        const externalFonts: string[] = [];
        page.on("request", (request) => {
          if (/fonts\.(googleapis|gstatic)\.com/.test(request.url()))
            externalFonts.push(request.url());
        });
        await page.setViewportSize({ width, height: 1000 });
        // Layout needs the document and fonts, not every remote image's load event.
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        if (name === "account") {
          await expect.poll(() =>
            page.locator(".account-photo img").evaluate((image: HTMLImageElement) => image.naturalWidth),
          ).toBeGreaterThan(0);
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          name + " at " + width + "px",
        ).toBe(true);
        if (width === 390 || width === 1440) {
          await page.screenshot({
            path: "test-results/design-" + name + "-" + width + ".png",
            fullPage: name === "account",
          });
        }
        expect(externalFonts).toEqual([]);
      });
    }
  }

  test("administration redirects visitors to their account", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/cuenta$/);
  });
});
