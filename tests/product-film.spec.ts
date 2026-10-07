import { test, expect } from "@playwright/test";

test("lemon pie spotlight loads on visibility, loops automatically and can pause", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/videos/pie-limon"))
      requests.push(request.url());
  });
  await page.goto("/");
  const spotlight = page.locator(".editorial-spotlight");
  const film = spotlight.locator(".product-film");
  const video = film.locator("video");
  await expect(video).not.toHaveAttribute("src");
  expect(requests).toEqual([]);
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "playing");
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.2);
  expect(
    await video.evaluate((v: HTMLVideoElement) => ({
      width: v.videoWidth,
      height: v.videoHeight,
      loop: v.loop,
      muted: v.muted,
      inline: v.playsInline,
    })),
  ).toEqual({
    width: testInfo.project.name === "mobile" ? 768 : 1280,
    height: testInfo.project.name === "mobile" ? 432 : 720,
    loop: true,
    muted: true,
    inline: true,
  });
  const source = await video.evaluate((v: HTMLVideoElement) => v.currentSrc);
  expect(source).toContain(
    testInfo.project.name === "mobile" ? "pie-limon-mobile." : "pie-limon.",
  );
  expect(new Set(requests.map((url) => new URL(url).pathname)).size).toBe(1);
  for (let cycle = 0; cycle < 2; cycle++) {
    await video.evaluate((v: HTMLVideoElement) => {
      v.currentTime = v.duration - 0.15;
    });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeLessThan(2);
    await expect(video).toHaveJSProperty("paused", false);
    await expect(film).toHaveAttribute("data-state", "playing");
  }
  await expect(
    film.getByRole("button", { name: /Ver otra vez/ }),
  ).toHaveCount(0);
  await spotlight
    .getByRole("button", { name: "Elegir Pie de limón en el postre estrella" })
    .click();
  const detail = page.getByRole("dialog", {
    name: "Pie de limón",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await expect(video).toHaveJSProperty("paused", true);
  await detail
    .getByRole("button", { name: "Cerrar detalle del producto" })
    .click();
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "playing");
  await film
    .getByRole("button", { name: "Pausar video de Pie de limón" })
    .click();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await film.scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty("paused", true);
});

test("product gallery starts video by choice, expands it and keeps the cart usable", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/videos/pie-limon"))
      requests.push(request.url());
  });
  await page.goto("/postres/pie-limon");
  await expect(page.locator(".product-gallery-open")).toBeVisible();
  expect(requests).toEqual([]);
  await page
    .getByRole("button", { name: "Ver video de Pie de limón", exact: true })
    .click();
  const inline = page.locator(".product-gallery-video .product-film");
  await expect(inline).toHaveAttribute("data-state", "playing");
  const trigger = page.getByRole("button", {
    name: "Ampliar video de Pie de limón",
  });
  await trigger.click();
  const expanded = page.getByRole("dialog", {
    name: "Video de Pie de limón",
    exact: true,
  });
  await expect(expanded.locator(".product-film")).toHaveAttribute(
    "data-state",
    "playing",
  );
  await expect(inline.locator("video")).toHaveJSProperty("paused", true);
  await page.keyboard.press("Escape");
  await expect(expanded).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(inline).toHaveAttribute("data-state", "playing");
  await page
    .getByRole("button", { name: "Ver foto 1 de 1 de Pie de limón" })
    .click();
  await expect(inline).toHaveCount(0);
  await page.getByRole("radio", { name: /Entero/ }).check();
  await page
    .getByRole("button", { name: "Agregar 1 al carrito", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir carrito, 1 productos" })
    .click();
  const cart = page.getByRole("dialog", { name: "Tu carrito" });
  await expect(cart.locator(".cart-item")).toContainText("Pie de limón");
  await expect(cart.getByLabel("Presentación de Pie de limón")).toHaveValue(
    "entero",
  );
  await cart.getByRole("button", { name: "Continuar como invitado" }).click();
  await expect(
    page.getByRole("dialog", { name: "Los detalles de tu pedido" }),
  ).toBeVisible();
});

test("nested video closes independently and returns focus to the quick view", async ({
  page,
}) => {
  await page.goto("/catalogo?categoria=Pies");
  const trigger = page.getByRole("button", {
    name: "Ver detalles de Pie de limón",
    exact: true,
  });
  await trigger.click();
  const detail = page.getByRole("dialog", {
    name: "Pie de limón",
    exact: true,
  });
  await detail
    .getByRole("button", { name: "Ver video de Pie de limón", exact: true })
    .click();
  const expand = detail.getByRole("button", {
    name: "Ampliar video de Pie de limón",
  });
  await expand.click();
  await expect(page.locator("dialog[open]")).toHaveCount(2);
  await page.getByRole("button", { name: "Cerrar video ampliado" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(expand).toBeFocused();
  expect(await page.locator("body").evaluate((e) => e.style.overflow)).toBe(
    "hidden",
  );
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.locator("body").evaluate((e) => e.style.overflow)).not.toBe(
    "hidden",
  );
});

for (const preference of ["reduced-motion", "save-data"] as const) {
  test(`${preference} defers the pie film until explicit playback`, async ({
    page,
  }) => {
    if (preference === "reduced-motion")
      await page.emulateMedia({ reducedMotion: "reduce" });
    else
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          value: Object.assign(new EventTarget(), { saveData: true }),
        });
      });
    await page.goto("/");
    const film = page.locator(".editorial-spotlight .product-film");
    await film.scrollIntoViewIfNeeded();
    await expect(film.locator("img")).toBeVisible();
    await expect(film.locator("video")).not.toHaveAttribute("src");
    await film
      .getByRole("button", { name: "Reproducir video de Pie de limón" })
      .click();
    await expect(film).toHaveAttribute("data-state", "playing");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(film.locator("video")).toHaveJSProperty("paused", true);
  });
}

test("failed film requests leave the poster and ordering available", async ({
  page,
}) => {
  await page.route("**/videos/pie-limon*", (route) => route.abort());
  await page.goto("/");
  const spotlight = page.locator(".editorial-spotlight");
  const film = spotlight.locator(".product-film");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "fallback");
  await expect(film.locator("img")).toBeVisible();
  await expect(film.getByRole("status")).toContainText(
    "El video no pudo cargarse",
  );
  await spotlight
    .getByRole("button", { name: "Elegir Pie de limón en el postre estrella" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Pie de limón", exact: true }),
  ).toBeVisible();
});

test("blocked autoplay retains a working manual play action", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
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
        ? original.call(this)
        : Promise.reject(
            new DOMException("Autoplay blocked", "NotAllowedError"),
          );
    };
  });
  await page.goto("/");
  const film = page.locator(".editorial-spotlight .product-film");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-state", "blocked");
  await film
    .getByRole("button", { name: "Reproducir video de Pie de limón" })
    .click();
  await expect(film).toHaveAttribute("data-state", "playing");
});
