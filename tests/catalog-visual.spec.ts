import { expect, test } from "@playwright/test";

test("inspect the catalogue layout", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/catalogo");
  await expect(page.locator(".product-card")).toHaveCount(11);
  await page.screenshot({
    path: `test-results/refero-catalog-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    layout: getComputedStyle(document.querySelector(".catalog-layout")!)
      .gridTemplateColumns,
    categories: getComputedStyle(
      document.querySelector(".catalog-layout .category-list")!,
    ).flexDirection,
  }));
  console.log(JSON.stringify({ project: testInfo.project.name, result, errors }));
  expect(result.overflow).toBe(false);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Pies", exact: true }).click();
  await expect(page).toHaveURL(/categoria=Pies/);
  await expect(page.getByRole("button", { name: /Limpiar filtros/ })).toBeVisible();
  await page.getByRole("button", { name: /Limpiar filtros/ }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.locator(".product-card")).toHaveCount(11);
});
