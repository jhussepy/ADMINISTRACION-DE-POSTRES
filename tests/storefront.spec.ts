import { test, expect } from "@playwright/test";
test("public catalogue, cart persistence, guest checkout and WhatsApp handoff", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /La vida sabe/ }),
  ).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(4);
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
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir carrito, 1 productos", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Por cotizar", { exact: true }).first(),
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
  await dialog.getByLabel("Fecha deseada").fill("2099-09-30");
  await dialog
    .getByLabel("¿Algo que debamos saber?")
    .fill("Celebración + fresas");
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
  await expect.poll(() => whatsapp).not.toBe("");
  const url = new URL(whatsapp);
  expect(url.pathname).toBe("/51934219749");
  const message = url.searchParams.get("text")!;
  expect(message).toContain("2 × Cheesecake de fresa");
  expect(message).toContain("María & José");
  expect(message).toContain("Celebración + fresas");
  expect(message).toContain("aún no está confirmado");
  await page.goto("/");
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
  await page.goto("/");
  const search =
    testInfo.project.name === "mobile"
      ? page.getByRole("textbox", { name: "Buscar en catálogo" })
      : page.getByRole("textbox", { name: "Buscar postres", exact: true });
  await search.fill("jamon");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await search.fill("inexistente");
  await expect(page.getByText("No encontramos ese antojo")).toBeVisible();
  await page.getByRole("button", { name: "Ver toda la carta" }).click();
  await expect(page.locator(".product-card")).toHaveCount(4);
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
    page.getByRole("heading", { name: "Compra a tu ritmo" }),
  ).toBeVisible();
  await page.goto("/cuenta/clave");
  await expect(page).toHaveURL(/\/cuenta$/);
});

test("product details support quantities, keyboard closing and mobile cart access", async ({
  page,
}, testInfo) => {
  await page.goto("/");
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
    detail.getByAltText("Diseño referencial completo de Cheesecake de fresa"),
  ).toBeVisible();
  await expect
    .poll(() =>
      detail
        .locator("img")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({
    path: `test-results/yemape-detail-${testInfo.project.name}.png`,
  });
  await detail
    .getByRole("button", { name: "Aumentar cantidad del producto" })
    .click();
  await detail
    .getByRole("button", { name: "Aumentar cantidad del producto" })
    .click();
  await detail
    .getByRole("button", { name: "Agregar 3 al carrito", exact: true })
    .click();
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
  await detail
    .getByRole("button", { name: "Agregar 17 al carrito", exact: true })
    .click();
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
  await page.getByLabel("Fecha deseada").fill("2099-09-30");
  await expect(
    page.getByRole("heading", { name: "Revisa tu selección" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar como invitado" }).click();
  await expect(page.getByLabel("Tu nombre", { exact: true })).toHaveValue(
    "Cliente de prueba",
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
