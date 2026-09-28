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
  console.log(
    JSON.stringify({ project: testInfo.project.name, result, errors }),
  );
  expect(result.overflow).toBe(false);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Pies", exact: true }).click();
  await expect(page).toHaveURL(/categoria=Pies/);
  await expect(
    page.getByRole("button", { name: /Limpiar filtros/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Limpiar filtros/ }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.locator(".product-card")).toHaveCount(11);
});

test("tablet categories remain reachable from both ends", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Tablet widths are checked once",
  );

  for (const width of [621, 768, 950, 1020]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/catalogo");
    const categories = page.locator(".catalog-layout .category-list");
    const first = categories.getByRole("button", { name: "Todos los antojos" });
    const last = categories.getByRole("button", { name: "Salados" });

    const leftEdge = await categories.evaluate(
      (element) => element.getBoundingClientRect().left,
    );
    const firstEdge = await first.evaluate(
      (element) => element.getBoundingClientRect().left,
    );
    expect(
      firstEdge,
      `First category is clipped at ${width}px`,
    ).toBeGreaterThanOrEqual(leftEdge - 1);

    await categories.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const rightEdge = await categories.evaluate(
      (element) => element.getBoundingClientRect().right,
    );
    const lastEdge = await last.evaluate(
      (element) => element.getBoundingClientRect().right,
    );
    expect(
      lastEdge,
      `Last category is unreachable at ${width}px`,
    ).toBeLessThanOrEqual(rightEdge + 1);
  }
});
