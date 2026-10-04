import { test, expect } from "@playwright/test";

test("home scenes can pause and both product choices use the existing cart", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const hero = page.locator(".patisserie-hero");
  const spotlight = page.locator(".dessert-spotlight");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(hero).toHaveAttribute("data-motion", "active");
  await expect(spotlight).toHaveAttribute("data-motion", "paused");
  const cake = hero.locator(".patisserie-cake");
  const before = await cake.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.evaluate(() => scrollBy(0, 150));
  await expect
    .poll(() => cake.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(hero).toHaveAttribute("data-motion", "paused");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(hero).toHaveAttribute("data-motion", "active");
  await hero
    .getByRole("button", { name: "Pausar animación del postre" })
    .click();
  await expect(hero).toHaveAttribute("data-motion", "paused");
  await expect(
    hero.getByRole("button", { name: "Reanudar animación del postre" }),
  ).toHaveAttribute("aria-pressed", "true");
  const motionState = await hero
    .locator(".scene-ambient")
    .first()
    .evaluate((element) => getComputedStyle(element).animationPlayState);
  expect(motionState).toBe("paused");
  await expect
    .poll(() =>
      hero
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await hero.screenshot({
    path: `test-results/yemape-home-hero-${testInfo.project.name}.png`,
    style:
      ".site-header, .skip-link, .toast { visibility: hidden !important; }",
  });
  await hero
    .getByRole("button", { name: "Descubrir Torta de chocolate", exact: true })
    .click();
  const detail = page.getByRole("dialog", {
    name: "Torta de chocolate",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: /^Agregar 1 al carrito/ }).click();
  await expect(detail).not.toBeVisible();
  await spotlight.scrollIntoViewIfNeeded();
  await expect(spotlight).toHaveAttribute("data-motion", "paused");
  await expect
    .poll(() =>
      spotlight
        .locator("img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await spotlight.screenshot({
    path: `test-results/yemape-home-spotlight-${testInfo.project.name}.png`,
    style:
      ".site-header, .skip-link, .toast { visibility: hidden !important; }",
  });
  await spotlight
    .getByRole("button", {
      name: "Elegir Torta de chocolate en el postre estrella",
    })
    .click();
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: /^Agregar 1 al carrito/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Abrir carrito, 2 productos",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion leaves the new home readable and usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator(".patisserie-hero");
  await expect(hero).toHaveAttribute("data-motion", "reduced");
  await expect(hero.locator(".patisserie-motion-toggle")).toBeHidden();
  expect(
    await hero
      .locator(".scene-ambient")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await page
    .getByRole("link", { name: "Cómo hacer tu pedido", exact: true })
    .click();
  await expect(page).toHaveURL(/#como-pedir$/);
  await expect(
    page.getByRole("heading", { name: "De un antojo a tu mesa." }),
  ).toBeInViewport();
  await page.locator(".dessert-spotlight").scrollIntoViewIfNeeded();
  await expect(page.locator(".dessert-spotlight")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  expect(
    await page
      .locator(".spotlight-photo")
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
});

test("home composition fits narrow, tablet and wide viewports", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Additional widths checked once",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 700, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(await overflow(), `Home overflow at ${width}px`).toBe(false);
    await page
      .locator(".patisserie-hero")
      .screenshot({ path: `test-results/yemape-home-${width}.png` });
    const categories = page.locator(".home-discovery .category-list");
    await categories.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const last = categories.getByRole("link", { name: "Salados", exact: true });
    const edges = await last.evaluate((element) => ({
      last: element.getBoundingClientRect().right,
      list: element.parentElement!.getBoundingClientRect().right,
    }));
    expect(edges.last).toBeLessThanOrEqual(edges.list + 1);
    await page.locator(".dessert-spotlight").scrollIntoViewIfNeeded();
    expect(await overflow(), `Spotlight overflow at ${width}px`).toBe(false);
  }
});
