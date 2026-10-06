import { test, expect } from "@playwright/test";

test("shared pages fit narrow screens and load fonts from the site", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "This check covers both screen sizes.");
  test.setTimeout(120_000);
  const externalFonts: string[] = [];
  page.on("request", request => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) externalFonts.push(request.url());
  });
  for (const width of [320, 390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, path] of [["home", "/"], ["catalog", "/catalogo"], ["product", "/postres/pie-limon"], ["account", "/cuenta"], ["privacy", "/privacidad"], ["payment-result", "/pago/resultado"]]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      if (name === "account") await expect.poll(() => page.locator(".account-photo img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + " at " + width + "px").toBe(true);
      if (width === 390 || width === 1440) await page.screenshot({ path: "test-results/design-" + name + "-" + width + ".png", fullPage: name === "account" });
    }
  }
  expect(externalFonts).toEqual([]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/cuenta$/);
});
