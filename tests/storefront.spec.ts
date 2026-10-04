import { test, expect, type Locator } from "@playwright/test";

async function expectImageLoaded(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  // This helper checks the image bytes, not Chromium's lazy-loading scheduler.
  // A programmatic scroll can leave a lazy image pending in headless CI.
  await image.evaluate((element) => {
    (element as HTMLImageElement).loading = "eager";
  });
  try {
    await expect
      .poll(
        () =>
          image.evaluate(
            (element) => (element as HTMLImageElement).naturalWidth,
          ),
        { timeout: 15_000, intervals: [250, 500, 1000] },
      )
      .toBeGreaterThan(0);
  } catch (error) {
    const details = await image.evaluate(async (element) => {
      const img = element as HTMLImageElement;
      const source = img.currentSrc || img.src;
      let response = "unavailable";
      try {
        const result = await fetch(source);
        response = String(result.status);
      } catch (reason) {
        response = String(reason);
      }
      return { alt: img.alt, source, complete: img.complete, response };
    });
    throw new Error(`Image did not load: ${JSON.stringify(details)}`, {
      cause: error,
    });
  }
}
test("shareable product page keeps the cart while browsing related desserts", async ({
  page,
}, testInfo) => {
  await page.goto("/postres/torta-chocolate");
  await expect(
    page.getByRole("heading", { name: "Torta de chocolate", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Torta de chocolate/);
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
  await expectImageLoaded(page.locator(".product-page-image img"));
  await page.screenshot({
    path: `test-results/yemape-product-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Aumentar cantidad del producto" })
    .click();
  await page.getByRole("button", { name: "Agregar 2 al carrito" }).click();
  await page.getByRole("link", { name: /Terremoto de lúcuma/ }).click();
  await expect(page).toHaveURL(/\/postres\/terremoto-lucuma$/);
  await expect(
    page.getByRole("button", { name: "Abrir carrito, 2 productos" }),
  ).toBeVisible();
  const missing = await page.goto("/postres/no-existe");
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Por aquí no hay postres." }),
  ).toBeVisible();
});

test("custom cake page leads to guest WhatsApp order with customer details", async ({
  page,
}, testInfo) => {
  await page.goto("/postres/torta-personalizada");
  await expect(
    page.getByRole("heading", { name: "Tu torta, tu celebración", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Cuéntanos cómo la imaginas.")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
  await page.screenshot({
    path: `test-results/yemape-custom-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Agregar y preparar pedido" }).click();
  const cart = page.getByRole("dialog");
  await expect(cart).toBeVisible();
  await cart.getByRole("button", { name: "Continuar como invitado" }).click();
  await cart.getByLabel("Tu nombre", { exact: true }).fill("Cliente de prueba");
  await cart.getByLabel("Teléfono para coordinar").fill("934 219 749");
  await cart.getByLabel("Fecha deseada").fill("2099-09-30");
  await cart.getByLabel("¿Para cuántas personas?").fill("12");
  await cart.getByLabel("Sabor que te gustaría").fill("Chocolate");
  await cart
    .getByLabel("Temática, colores o idea")
    .fill("Flores en tonos pastel");
  await cart
    .getByLabel("¿Algo que debamos saber?")
    .fill("Dedicatoria para María");
  let whatsapp = "";
  await page.route("https://wa.me/**", async (route) => {
    whatsapp = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "Prueba sin envío de mensajes.",
    });
  });
  await cart
    .getByRole("button", { name: "Finalizar pedido por WhatsApp" })
    .click();
  await page.waitForURL((url) => url.hostname === "wa.me", {
    waitUntil: "load",
  });
  const message = new URL(whatsapp).searchParams.get("text")!;
  expect(message).toContain("Tu torta, tu celebración");
  expect(message).toContain("Personas: 12");
  expect(message).toContain("Sabor: Chocolate");
  expect(message).toContain("Diseño o temática: Flores en tonos pastel");
  expect(message).toContain("Dedicatoria para María");
});
test("catalog filters, search, reload and browser history follow the URL", async ({
  page,
}, testInfo) => {
  await page.goto("/catalogo?categoria=Kekes");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Tortas", exact: true }).click();
  await expect(page).toHaveURL(/\/catalogo\?categoria=Tortas$/);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.goBack();
  await expect(page).toHaveURL(/\/catalogo\?categoria=Kekes$/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.goForward();
  await expect(page.locator(".product-card")).toHaveCount(2);

  const search =
    testInfo.project.name === "mobile"
      ? page.getByRole("textbox", { name: "Buscar en catálogo" })
      : page.getByRole("textbox", { name: "Buscar postres" });
  await search.fill("chocolate");
  await expect(page).toHaveURL(
    /\/catalogo\?categoria=Tortas&buscar=chocolate$/,
  );
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.reload();
  await expect(search).toHaveValue("chocolate");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await search.fill("");
  await expect(page).toHaveURL(/\/catalogo\?categoria=Tortas$/);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Todos los antojos" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.locator(".product-card")).toHaveCount(11);
});
test("new pies and brownie have shareable product pages and valid photos", async ({
  page,
}) => {
  await page.goto("/catalogo?categoria=Pies");
  await expect(page.locator(".product-card")).toHaveCount(3);
  for (const id of [
    "pie-limon",
    "pie-maracuya",
    "pie-manzana",
    "brownie-chocolate",
  ]) {
    await page.goto(`/postres/${id}`);
    await expect(page.locator(".product-page-image img")).toBeVisible();
    await expectImageLoaded(page.locator(".product-page-image img"));
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      new RegExp(`${id}\\.webp$`),
    );
  }
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  for (const id of [
    "pie-limon",
    "pie-maracuya",
    "pie-manzana",
    "brownie-chocolate",
  ])
    expect(sitemap).toContain(`/postres/${id}`);
});
test("two presentations stay separate in the cart and WhatsApp describes the example", async ({
  page,
}) => {
  await page.goto("/postres/pie-limon");
  await page.getByRole("radio", { name: /Entero/ }).check();
  await page.getByRole("button", { name: "Agregar 1 al carrito" }).click();
  await page.goto("/catalogo?categoria=Pies");
  await page
    .getByRole("button", { name: "Agregar Pie de limón al carrito" })
    .click();
  await page
    .getByRole("button", { name: "Abrir carrito, 2 productos" })
    .click();
  const cart = page.getByRole("dialog", { name: "Tu carrito" });
  await expect(cart.getByLabel("Presentación de Pie de limón")).toHaveCount(2);
  await expect(cart.getByText("Estimado de muestra")).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir carrito, 2 productos" })
    .click();
  const restored = page.getByRole("dialog");
  await expect(restored.getByLabel("Presentación de Pie de limón")).toHaveCount(
    2,
  );
  await restored
    .getByRole("button", { name: "Continuar como invitado" })
    .click();
  await restored
    .getByLabel("Tu nombre", { exact: true })
    .fill("Cliente de prueba");
  await restored.getByLabel("Teléfono para coordinar").fill("934 219 749");
  await restored.getByLabel("Fecha deseada").fill("2099-09-30");
  let whatsapp = "";
  await page.route("https://wa.me/**", async (route) => {
    whatsapp = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "Prueba sin envío",
    });
  });
  await restored
    .getByRole("button", { name: "Finalizar pedido por WhatsApp" })
    .click();
  await page.waitForURL((url) => url.hostname === "wa.me", {
    waitUntil: "load",
  });
  const message = new URL(whatsapp).searchParams.get("text")!;
  expect(message).toContain("1 × Pie de limón");
  expect(message).toContain("Porción — Precio pendiente de confirmación");
  expect(message).toContain("Entero · aprox. 10 porciones — Precio pendiente de confirmación");
  expect(message).toContain("Pendiente de cotización");
  expect(message).not.toContain("(ejemplo)");
});
test("front-page categories open a filtered carta and preserve the cart", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Kekes", exact: true }).click();
  await expect(page).toHaveURL(/\/catalogo\?categoria=Kekes$/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Agregar Keke de arándanos al carrito" })
    .click();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Abrir carrito, 1 productos" }),
  ).toBeVisible();
  if (testInfo.project.name === "desktop") {
    const search = page.getByRole("textbox", { name: "Buscar postres" });
    await search.fill("lúcuma");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/catalogo\?buscar=/);
    await expect(page.locator(".product-card")).toHaveCount(1);
    await expect(
      page.getByText("Terremoto de lúcuma", { exact: true }),
    ).toBeVisible();
  }
});
test("public catalogue, cart persistence, guest checkout and WhatsApp handoff", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /La vida sabe/ }),
  ).toBeVisible();
  await expect(page.locator(".wave-gallery")).toBeVisible();
  await expect(page.getByRole("button", { name: "Postre siguiente" })).toBeVisible();
  await page
    .getByRole("link", { name: "Ver toda la carta", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.locator(".product-card")).toHaveCount(11);
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs
            .filter((i) => i.getAttribute("loading") !== "lazy")
            .every(
              (i) =>
                (i as HTMLImageElement).complete &&
                (i as HTMLImageElement).naturalWidth > 0,
            ),
        ),
    )
    .toBeTruthy();
  await page
    .getByRole("button", {
      name: "Agregar Cheesecake de fresa al carrito",
      exact: true,
    })
    .click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `test-results/yemape-home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Abrir carrito, 1 productos", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(/Importes de ejemplo para probar el carrito/),
  ).toBeVisible();
  await dialog
    .getByRole("button", {
      name: "Sumar una unidad de Cheesecake de fresa",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Continuar como invitado", exact: true })
    .click();
  await dialog.getByLabel("Tu nombre", { exact: true }).fill("María & José");
  await dialog.getByRole("radio", { name: "Delivery", exact: true }).check();
  await dialog.getByLabel("Distrito y dirección").fill("Ventanilla, calle 123");
  await dialog.getByLabel("Teléfono para coordinar").fill("934 219 749");
  await dialog.getByLabel("Fecha deseada").fill("2099-09-30");
  await dialog
    .getByLabel("¿Algo que debamos saber?")
    .fill("Celebración + fresas");
  await dialog.getByText("¿Es para regalo o celebración?").click();
  await dialog.getByLabel("Ocasión").fill("Cumpleaños");
  await dialog.getByLabel("Dedicatoria solicitada").fill("Feliz día, María");
  let whatsapp = "";
  await page.route("https://wa.me/**", async (route) => {
    whatsapp = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<p>Destino externo interceptado para la prueba. Ningún mensaje enviado.</p>",
    });
  });
  await dialog
    .getByRole("button", { name: "Finalizar pedido por WhatsApp", exact: true })
    .click();
  // Receiving the request is earlier than completing navigation. Wait for the
  // intercepted document before asserting or returning to the storefront.
  await page.waitForURL((url) => url.hostname === "wa.me", {
    waitUntil: "load",
  });
  await expect.poll(() => whatsapp).not.toBe("");
  const url = new URL(whatsapp);
  expect(url.pathname).toBe("/51934219749");
  const message = url.searchParams.get("text")!;
  expect(message).toContain("2 × Cheesecake de fresa");
  expect(message).toContain("María & José");
  expect(message).toContain("Celebración + fresas");
  expect(message).toContain("Ocasión: Cumpleaños");
  expect(message).toContain("Dedicatoria: Feliz día, María");
  expect(message).toContain("Precio pendiente de confirmación");
  expect(message).toContain("Pendiente de confirmación de disponibilidad y pago");
  expect(message).not.toContain("(ejemplo)");
  await page.goto("/catalogo");
  await expect(
    page.getByRole("button", {
      name: "Abrir carrito, 2 productos",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("filters, empty states, protected administration and responsive layout", async ({
  page,
}, testInfo) => {
  await page.goto("/catalogo");
  const search =
    testInfo.project.name === "mobile"
      ? page.getByRole("textbox", { name: "Buscar en catálogo" })
      : page.getByRole("textbox", { name: "Buscar postres", exact: true });
  await search.fill("jamon");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await search.fill("inexistente");
  await expect(page.getByText("No encontramos ese antojo")).toBeVisible();
  await page.getByRole("button", { name: "Ver toda la carta" }).click();
  await expect(page.locator(".product-card")).toHaveCount(11);
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
  await page
    .getByRole("button", { name: "Abrir carrito, 0 productos", exact: true })
    .click();
  await expect(page.getByText("Aquí comienza tu antojo")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(
    page.getByRole("heading", { name: "Entra con Google" }),
  ).toBeVisible();
  await page.goto("/cuenta/clave");
  await expect(page).toHaveURL(/\/cuenta$/);
});

test("product details support quantities, keyboard closing and mobile cart access", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Toda la carta", exact: true }).click();
  const open = page.getByRole("button", {
    name: "Ver detalles de Cheesecake de fresa",
    exact: true,
  });
  await open.click();
  const detail = page.getByRole("dialog", {
    name: "Cheesecake de fresa",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await expect(
    detail.getByAltText("Presentación de Cheesecake de fresa"),
  ).toBeVisible();
  await expectImageLoaded(detail.locator("img"));
  await page.screenshot({
    path: `test-results/yemape-detail-${testInfo.project.name}.png`,
  });
  await detail
    .getByRole("button", { name: "Aumentar cantidad del producto" })
    .click();
  await detail
    .getByRole("button", { name: "Aumentar cantidad del producto" })
    .click();
  await detail.getByRole("button", { name: /^Agregar 3 al carrito/ }).click();
  await expect(detail).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Abrir carrito, 3 productos",
      exact: true,
    }),
  ).toBeVisible();
  await open.click();
  await expect(detail.getByText("Ya tienes 3 en el carrito.")).toBeVisible();
  for (let i = 0; i < 16; i++)
    await detail
      .getByRole("button", { name: "Aumentar cantidad del producto" })
      .click();
  await expect(
    detail.getByRole("button", { name: "Aumentar cantidad del producto" }),
  ).toBeDisabled();
  await detail.getByRole("button", { name: /^Agregar 17 al carrito/ }).click();
  await open.click();
  await expect(
    detail.getByRole("button", { name: "Límite de unidades alcanzado" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(detail).not.toBeVisible();
  await expect(open).toBeFocused();
  if (testInfo.project.name === "mobile")
    await page
      .getByRole("button", { name: "Ver mi carrito", exact: true })
      .click();
  else
    await page
      .getByRole("button", { name: "Abrir carrito, 20 productos", exact: true })
      .click();
  const cart = page.getByRole("dialog", { name: "Tu carrito", exact: true });
  await cart.getByRole("button", { name: "Continuar como invitado" }).click();
  await page.getByLabel("Tu nombre", { exact: true }).fill("Cliente de prueba");
  await page.getByLabel("Teléfono para coordinar").fill("934 219 749");
  await page.getByLabel("Fecha deseada").fill("2099-09-30");
  await expect(
    page.getByRole("heading", { name: "Revisa tu selección" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar como invitado" }).click();
  await expect(page.getByLabel("Tu nombre", { exact: true })).toHaveValue(
    "Cliente de prueba",
  );
  await expect(page.getByLabel("Teléfono para coordinar")).toHaveValue(
    "934 219 749",
  );
  await expect(page.getByLabel("Fecha deseada")).toHaveValue("2099-09-30");
  await page.keyboard.press("Escape");
  await page
    .getByText("¿Necesito una cuenta para pedir?", { exact: true })
    .click();
  await expect(
    page.getByText(
      "No. Puedes elegir tus productos, completar los datos del pedido y continuar por WhatsApp como invitado.",
    ),
  ).toBeVisible();
});

test("photographic catalogue filters and new products reach the WhatsApp handoff", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".patisserie-cake img")).toHaveAttribute(
    "alt",
    "Torta de chocolate",
  );
  for (const img of await page.locator(".product-photo img").all())
    await expectImageLoaded(img);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `test-results/yemape-photos-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const heroButton = page.getByRole("button", {
    name: "Descubrir Torta de chocolate",
    exact: true,
  });
  await heroButton.click();
  const detail = page.getByRole("dialog", {
    name: "Torta de chocolate",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await expectImageLoaded(detail.locator("img"));
  await page.screenshot({
    path: `test-results/yemape-photo-detail-${testInfo.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(heroButton).toBeFocused();
  await page
    .getByRole("link", { name: "Ver toda la carta", exact: true })
    .click();
  await page.getByRole("button", { name: "Kekes", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Agregar Keke de arándanos al carrito",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Postres", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page
    .getByRole("button", {
      name: "Agregar Terremoto de lúcuma al carrito",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Tortas", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page
    .getByRole("button", {
      name: "Agregar Torta de chocolate al carrito",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Abrir carrito, 3 productos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continuar como invitado", exact: true })
    .click();
  await page.getByLabel("Tu nombre", { exact: true }).fill("Pedido de prueba");
  await page.getByLabel("Teléfono para coordinar").fill("934 219 749");
  await page.getByLabel("Fecha deseada").fill("2099-09-30");
  for (const name of [
    "Torta de chocolate",
    "Keke de arándanos",
    "Terremoto de lúcuma",
  ])
    await expect(
      page
        .locator(".checkout-review")
        .getByText(`1 × ${name}`, { exact: false }),
    ).toBeVisible();
  let whatsapp = "";
  await page.route("https://wa.me/**", async (route) => {
    whatsapp = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "Prueba sin envío de mensajes.",
    });
  });
  await page
    .getByRole("button", { name: "Finalizar pedido por WhatsApp", exact: true })
    .click();
  // Receiving the request is earlier than completing navigation. Wait for the
  // intercepted document before asserting or returning to the storefront.
  await page.waitForURL((url) => url.hostname === "wa.me", {
    waitUntil: "load",
  });
  await expect.poll(() => whatsapp).not.toBe("");
  const message = new URL(whatsapp).searchParams.get("text")!;
  for (const name of [
    "Torta de chocolate",
    "Keke de arándanos",
    "Terremoto de lúcuma",
  ])
    expect(message).toContain(`1 × ${name}`);
  expect(message).toContain("Precio pendiente de confirmación");
  expect(message).toContain("Pendiente de cotización");
  expect(errors).toEqual([]);
});


test("favorites persist, sorting works and hero motion remains available", async ({ page }) => {
  await page.goto("/catalogo");
  const favorite = page.getByRole("button", {
    name: "Guardar Torta de chocolate en favoritos",
  });
  await favorite.click();
  await expect(
    page.getByRole("button", { name: "Quitar Torta de chocolate de favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Quitar Torta de chocolate de favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /Mis favoritos/ }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Torta de chocolate", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Mis favoritos/ }).click();
  await page.getByLabel("Ordenar catálogo").selectOption("price-asc");
  await expect(page).toHaveURL(/orden=price-asc/);
  await expect(page.locator(".product-card").first()).toContainText(
    "Brownie de chocolate",
  );

  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Pausar animación del postre" }),
  ).toBeVisible();
});

test("product page can copy its share link when native sharing is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  await page.goto("/postres/pie-limon");
  await page.getByRole("button", { name: "Compartir Pie de limón" }).click();
  await expect(page.getByText("Enlace copiado")).toBeVisible();
});


test("account page advertises Google access when Clerk is not configured", async ({ page }) => {
  await page.goto("/cuenta");
  await expect(
    page.getByRole("heading", { name: "Entra con Google", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("El acceso con Google está temporalmente deshabilitado."),
  ).toBeVisible();
  await expect(page.getByText(/contraseña/i)).toHaveCount(0);
});
