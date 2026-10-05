import { test, expect } from "@playwright/test";

test("uploaded cake film plays, pauses, and leaves both product entries usable", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  const models: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith(".glb")) models.push(request.url());
  });
  await page.goto("/");
  const hero = page.locator(".immersive-hero");
  const film = hero.locator(".dessert-film");
  const video = film.locator("video");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "playing");
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0.2);
  const source = await video.evaluate((el: HTMLVideoElement) => el.currentSrc);
  expect(source).toContain(
    testInfo.project.name === "mobile"
      ? "torta-chocolate-mobile."
      : "torta-chocolate.",
  );
  expect(
    await video.evaluate((el: HTMLVideoElement) => ({
      width: el.videoWidth,
      height: el.videoHeight,
      muted: el.muted,
      inline: el.playsInline,
    })),
  ).toEqual({
    width: testInfo.project.name === "mobile" ? 768 : 1280,
    height: testInfo.project.name === "mobile" ? 432 : 720,
    muted: true,
    inline: true,
  });
  await hero.getByRole("button", { name: "Pausar video de la torta" }).click();
  await expect(video).toHaveJSProperty("paused", true);
  const time = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
  await page.waitForTimeout(250);
  expect(await video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBe(
    time,
  );
  await hero
    .getByRole("button", { name: "Reproducir video de la torta" })
    .click();
  await expect(film).toHaveAttribute("data-state", "playing");
  await hero
    .getByRole("button", { name: "Descubrir Torta de chocolate", exact: true })
    .click();
  const detail = page.getByRole("dialog", {
    name: "Torta de chocolate",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await expect(video).toHaveJSProperty("paused", true);
  await detail
    .getByRole("button", { name: "Cerrar detalle del producto" })
    .click();
  await expect(film).toHaveAttribute("data-state", "playing");
  await hero
    .getByRole("button", { name: "Descubrir Torta de chocolate", exact: true })
    .click();
  await detail.getByRole("button", { name: /^Agregar 1 al carrito/ }).click();
  await page.getByRole("button", { name: /Abrir carrito, 1 producto/ }).click();
  const cart = page.getByRole("dialog", { name: "Tu carrito" });
  await expect(cart).toBeVisible();
  await cart.getByRole("button", { name: "Cerrar carrito" }).click();
  const spotlight = page.locator(".immersive-spotlight");
  await spotlight
    .getByRole("button", {
      name: "Elegir Pie de limón en el postre estrella",
    })
    .click();
  await page
    .getByRole("dialog", { name: "Pie de limón", exact: true })
    .getByRole("button", { name: /^Agregar 1 al carrito/ })
    .click();
  await page
    .getByRole("button", { name: /Abrir carrito, 2 productos/ })
    .click();
  await expect(cart.locator(".cart-item")).toHaveCount(2);
  await expect(cart).toContainText("Pie de limón");
  expect(models).toEqual([]);
  expect(errors).toEqual([]);
});

test("reduced motion uses the exact film poster and only loads video after an explicit play", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/videos/")) requests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const film = page.locator(".dessert-film");
  const video = film.locator("video");
  await film.scrollIntoViewIfNeeded();
  await expect(film.locator("img")).toBeVisible();
  await expect
    .poll(() =>
      film.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBe(1280);
  expect(await video.getAttribute("src")).toBeNull();
  expect(requests).toEqual([]);
  await film
    .getByRole("button", { name: "Reproducir video de la torta" })
    .click();
  await expect(film).toHaveAttribute("data-state", "playing");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveJSProperty("paused", true);
});

test("hidden tab, offscreen position, and a deliberate pause stop playback", async ({
  page,
}) => {
  await page.goto("/");
  const film = page.locator(".dessert-film");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "playing");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(film.locator("video")).toHaveJSProperty("paused", true);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(film).toHaveAttribute("data-state", "playing");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(film.locator("video")).toHaveJSProperty("paused", true);
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "playing");
  await film.getByRole("button", { name: "Pausar video de la torta" }).click();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "paused");
});

test("video network failure keeps the cake poster and product selection", async ({
  page,
}) => {
  await page.route("**/videos/*", (route) => route.abort());
  await page.goto("/");
  const film = page.locator(".dessert-film");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "fallback");
  await expect(film.locator("img")).toBeVisible();
  await expect(film.locator("button")).toBeHidden();
  await page
    .getByRole("button", { name: "Descubrir Torta de chocolate", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Torta de chocolate", exact: true }),
  ).toBeVisible();
});

test("blocked autoplay provides a working manual play button", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let allowed = false;
    document.addEventListener(
      "click",
      () => {
        allowed = true;
      },
      true,
    );
    HTMLMediaElement.prototype.play = function () {
      return allowed
        ? play.call(this)
        : Promise.reject(
            new DOMException("Autoplay blocked", "NotAllowedError"),
          );
    };
  });
  await page.goto("/");
  const film = page.locator(".dessert-film");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "blocked");
  await film
    .getByRole("button", { name: "Reproducir video de la torta" })
    .click();
  await expect(film).toHaveAttribute("data-state", "playing");
});

test("data saver defers video bytes until manual playback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: Object.assign(new EventTarget(), { saveData: true }),
    });
  });
  await page.goto("/");
  const film = page.locator(".dessert-film");
  await film.scrollIntoViewIfNeeded();
  await expect(film.locator("video")).not.toHaveAttribute("src");
  await film
    .getByRole("button", { name: "Reproducir video de la torta" })
    .click();
  await expect(film).toHaveAttribute("data-state", "playing");
});

test("film framing fits eight widths and the category scroller remains reachable", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Additional widths checked once",
  );
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 375, 621, 700, 768, 950, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const frame = page.locator(".dessert-film-frame");
    await frame.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `Overflow at ${width}`,
    ).toBe(false);
    const bounds = await frame.boundingBox();
    expect(bounds!.width / bounds!.height).toBeCloseTo(16 / 9, 2);
    const button = await frame.locator("button").boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44);
    expect(button!.x).toBeGreaterThan(bounds!.x);
    expect(button!.x + button!.width).toBeLessThan(bounds!.x + bounds!.width);
    await page.locator(".immersive-hero").screenshot({
      path: `test-results/yemape-film-${width}.png`,
      style: ".site-header, .skip-link { visibility: hidden }",
    });
    const list = page.locator(".home-discovery .category-list");
    await list.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const edges = await list
      .getByRole("link", { name: "Salados", exact: true })
      .evaluate((el) => ({
        last: el.getBoundingClientRect().right,
        list: el.parentElement!.getBoundingClientRect().right,
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

test("photographic categories open their filter and preserve the cart on return", async ({
  page,
}) => {
  await page.goto("/catalogo");
  await page
    .getByRole("button", { name: "Agregar Torta de chocolate al carrito" })
    .click();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Yemape, inicio" })
    .click();
  const categories = page.getByRole("region", {
    name: "Categorías de postres",
  });
  await expect(categories.locator(".photo-category")).toHaveCount(6);
  await categories.getByRole("link", { name: "Pies", exact: true }).click();
  await expect(page).toHaveURL(/\/catalogo\?categoria=Pies$/);
  await expect(page.locator(".product-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Pies", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("button", { name: "Abrir carrito, 1 productos" })
    .click();
  await expect(page.getByRole("dialog", { name: "Tu carrito" })).toContainText(
    "Torta de chocolate",
  );
});

test("editorial photograph loads and reduced motion leaves every section readable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const photo = page.locator(".spotlight-editorial-photo img");
  await photo.scrollIntoViewIfNeeded();
  await expect
    .poll(() => photo.evaluate((el: HTMLImageElement) => el.naturalWidth), {
      timeout: 15000,
    })
    .toBeGreaterThan(0);
  await expect(page.locator('[data-reveal-state="pending"]')).toHaveCount(0);
  await expect(page.locator(".editorial-spotlight")).toContainText(
    "Pie de limón",
  );
  await page
    .locator(".editorial-spotlight")
    .getByRole("button", {
      name: "Elegir Pie de limón en el postre estrella",
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Pie de limón", exact: true }),
  ).toBeVisible();
});
