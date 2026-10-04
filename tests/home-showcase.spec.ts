import { test, expect } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  },
});

test("the real 3D dessert rotates through 360 degrees, pauses, and keeps the cart working", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  const modelRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith("yemape-chocolate.glb"))
      modelRequests.push(request.url());
  });
  await page.goto("/");
  const hero = page.locator(".immersive-hero");
  const host = hero.locator(".dessert-render-host");
  await expect(page.locator("h1")).toHaveCount(1);
  await host.scrollIntoViewIfNeeded();
  await expect(host).toHaveAttribute("data-renderer", "ready", {
    timeout: 25000,
  });
  await expect(host).toHaveAttribute("data-state", "active");
  const angle = await host.getAttribute("data-angle");
  await expect.poll(() => host.getAttribute("data-angle")).not.toBe(angle);
  await hero
    .getByRole("button", { name: "Descubrir Torta de chocolate", exact: true })
    .click();
  const initialDetail = page.getByRole("dialog", {
    name: "Torta de chocolate",
    exact: true,
  });
  await expect(initialDetail).toBeVisible();
  await expect(host).toHaveAttribute("data-state", "paused");
  await initialDetail
    .getByRole("button", { name: "Cerrar detalle del producto" })
    .click();
  await expect(host).toHaveAttribute("data-state", "active");
  await hero
    .getByRole("button", { name: "Pausar animación del postre" })
    .click();
  await expect(host).toHaveAttribute("data-state", "paused");
  // Pause may render its final pose once; settle that frame before checking.
  await page.waitForTimeout(100);
  const frames = await host.getAttribute("data-frames");
  await page.waitForTimeout(180);
  expect(await host.getAttribute("data-frames")).toBe(frames);
  await hero
    .getByRole("button", { name: "Restablecer vista del postre" })
    .click();
  await expect(host).toHaveAttribute("data-angle", "-0.4500");
  const canvas = host.locator("canvas");
  const front = await canvas.screenshot();
  for (let i = 0; i < 4; i++)
    await hero
      .getByRole("button", { name: "Girar postre a la derecha" })
      .click();
  await expect
    .poll(async () => Number(await host.getAttribute("data-angle")))
    .toBeCloseTo(Math.PI - 0.45, 3);
  const back = await canvas.screenshot();
  expect(back.equals(front)).toBe(false);
  await hero.screenshot({
    path: `test-results/yemape-3d-back-${testInfo.project.name}.png`,
    style:
      ".site-header, .skip-link { visibility:hidden } .dessert-canvas { outline:none }",
  });
  for (let i = 0; i < 4; i++)
    await hero
      .getByRole("button", { name: "Girar postre a la derecha" })
      .click();
  await expect
    .poll(async () => Number(await host.getAttribute("data-angle")))
    .toBeCloseTo(Math.PI * 2 - 0.45, 3);
  await hero
    .getByRole("button", { name: "Restablecer vista del postre" })
    .click();
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await host.getAttribute("data-angle")))
    .toBeCloseTo(Math.PI / 4 - 0.45, 3);
  await page.keyboard.press("Home");
  await expect(host).toHaveAttribute("data-angle", "-0.4500");
  await hero.screenshot({
    path: `test-results/yemape-3d-front-${testInfo.project.name}.png`,
    style:
      ".site-header, .skip-link { visibility:hidden } .dessert-canvas { outline:none }",
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
  const spotlight = page.locator(".immersive-spotlight");
  await spotlight.locator(".dessert-render-host").scrollIntoViewIfNeeded();
  await expect(spotlight.locator(".dessert-render-host")).toHaveAttribute(
    "data-renderer",
    "ready",
    { timeout: 25000 },
  );
  await expect(spotlight.locator(".dessert-render-host")).toHaveAttribute(
    "data-state",
    "paused",
  );
  expect(modelRequests).toHaveLength(1);
  await spotlight.screenshot({
    path: `test-results/yemape-3d-spotlight-${testInfo.project.name}.png`,
    style:
      ".site-header, .skip-link { visibility:hidden } .dessert-canvas { outline:none }",
  });
  await spotlight
    .getByRole("button", {
      name: "Elegir Torta de chocolate en el postre estrella",
    })
    .click();
  await detail.getByRole("button", { name: /^Agregar 1 al carrito/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Abrir carrito, 2 productos",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("3D respects live reduced motion, hidden tabs, and offscreen visibility", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator(".immersive-hero");
  const host = hero.locator(".dessert-render-host");
  await host.scrollIntoViewIfNeeded();
  await expect(host).toHaveAttribute("data-renderer", "ready", {
    timeout: 25000,
  });
  await expect(host).toHaveAttribute("data-state", "reduced");
  await expect(hero.locator(".patisserie-motion-toggle")).toBeHidden();
  const angle = await host.getAttribute("data-angle");
  await page.waitForTimeout(180);
  expect(await host.getAttribute("data-angle")).toBe(angle);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(host).toHaveAttribute("data-state", "active");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(host).toHaveAttribute("data-state", "paused");
  const frames = await host.getAttribute("data-frames");
  await page.waitForTimeout(180);
  expect(await host.getAttribute("data-frames")).toBe(frames);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(host).toHaveAttribute("data-state", "active");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(host).toHaveAttribute("data-state", "paused");
  await host.scrollIntoViewIfNeeded();
  await expect(host).toHaveAttribute("data-state", "active");
});

test("3D failure keeps a usable photograph and product selection", async ({
  page,
}) => {
  await page.route("**/models/yemape-chocolate.glb", (route) => route.abort());
  await page.goto("/");
  const hero = page.locator(".immersive-hero");
  const host = hero.locator(".dessert-render-host");
  await expect(host).toHaveAttribute("data-renderer", "fallback", {
    timeout: 20000,
  });
  await expect(host.locator("img")).toBeVisible();
  await expect(hero.locator(".dessert-viewer-controls")).toBeHidden();
  await hero
    .getByRole("button", { name: "Descubrir Torta de chocolate", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Torta de chocolate", exact: true }),
  ).toBeVisible();
});

test("new composition fits five viewport widths with accessible category scrolling", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Additional widths checked once",
  );
  test.setTimeout(60000);
  await page.route("**/models/yemape-chocolate.glb", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 700, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `Overflow at ${width}`,
    ).toBe(false);
    await page
      .locator(".immersive-hero")
      .screenshot({ path: `test-results/yemape-immersive-${width}.png` });
    const list = page.locator(".home-discovery .category-list");
    await list.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const edges = await list
      .getByRole("link", { name: "Salados", exact: true })
      .evaluate((element) => ({
        last: element.getBoundingClientRect().right,
        list: element.parentElement!.getBoundingClientRect().right,
      }));
    expect(edges.last).toBeLessThanOrEqual(edges.list + 1);
  }
  await page
    .getByRole("link", { name: "Cómo hacer tu pedido", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "De un antojo a tu mesa." }),
  ).toBeInViewport();
});
