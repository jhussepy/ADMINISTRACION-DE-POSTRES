import { test, expect, type Page } from "@playwright/test";

async function openCheckout(page: Page) {
  await page.goto("/postres/torta-chocolate");
  await page
    .getByRole("button", { name: "Agregar 1 al carrito", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir carrito, 1 productos" })
    .click();
  await page.getByRole("button", { name: "Continuar como invitado" }).click();
  return page.getByRole("dialog");
}

test("presentation names have space in product pages and quick details", async ({
  page,
}) => {
  await page.goto("/postres/torta-chocolate");
  const firstLabel = page.locator(".presentation-options label").first();
  let text = await firstLabel.locator("span").boundingBox();
  const radio = await firstLabel.locator("input").boundingBox();
  expect(text!.width).toBeGreaterThan(100);
  expect(radio!.width).toBeLessThanOrEqual(24);
  await page.getByRole("link", { name: "Volver al catálogo" }).click();
  await page
    .getByRole("button", {
      name: "Ver detalles de Torta de chocolate",
      exact: true,
    })
    .click();
  text = await page
    .getByRole("dialog")
    .locator(".presentation-options span")
    .first()
    .boundingBox();
  expect(text!.width).toBeGreaterThan(100);
});

test("checkout summary follows delivery and keeps customer data when editing", async ({
  page,
}, testInfo) => {
  const dialog = await openCheckout(page);
  const summary = dialog.getByRole("region", { name: "Revisa tu selección" });
  await expect(dialog.getByLabel("¿Algo que debamos saber?")).toBeHidden();
  await expect(
    summary.getByText("Elige una fecha", { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("Tu nombre", { exact: true }).fill("María Pérez");
  await dialog.getByLabel("Teléfono para coordinar").fill("934219749");
  await dialog.getByLabel("Fecha deseada").fill("2099-09-30");
  await expect(
    summary.getByText(/30 de (septiembre|setiembre) de 2099/),
  ).toBeVisible();
  await dialog.getByRole("radio", { name: "Delivery", exact: true }).check();
  const address = dialog.getByLabel("Distrito y dirección");
  await expect(address).toHaveAttribute("required", "");
  await address.fill("Ventanilla, avenida Los Postres 123");
  await expect(
    summary.getByText("Ventanilla, avenida Los Postres 123", { exact: true }),
  ).toBeVisible();
  await dialog.getByText("Añadir una indicación (opcional)").click();
  await dialog.getByLabel("¿Algo que debamos saber?").fill("Llamar al llegar");
  await summary.getByRole("button", { name: "Editar", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Sumar una unidad de Torta de chocolate" })
    .click();
  await dialog.getByRole("button", { name: "Continuar como invitado" }).click();
  await expect(dialog.getByLabel("Tu nombre", { exact: true })).toHaveValue(
    "María Pérez",
  );
  await expect(dialog.getByLabel("Fecha deseada")).toHaveValue("2099-09-30");
  await expect(address).toHaveValue("Ventanilla, avenida Los Postres 123");
  await expect(summary.locator("li")).toContainText("2 × Torta de chocolate");
  await dialog.getByText("Añadir una indicación (opcional)").click();
  await expect(dialog.getByLabel("¿Algo que debamos saber?")).toHaveValue(
    "Llamar al llegar",
  );
  await dialog.getByText("Añadir una indicación (opcional)").click();
  await dialog.getByRole("radio", { name: "Recojo", exact: true }).check();
  await expect(address).toHaveCount(0);
  await expect(
    summary.getByText("Dirección solicitada", { exact: true }),
  ).toHaveCount(0);
  await expect(summary.getByText("Recojo", { exact: true })).toBeVisible();
  // These screenshots make the two-column and mobile flow reviewable.
  await dialog.evaluate((element) => element.scrollTo({ top: 0 }));
  await page.screenshot({
    path: `test-results/yemape-checkout-${testInfo.project.name}.png`,
  });
});

test("checkout errors focus the explanation and preserve the selection", async ({
  page,
}) => {
  const dialog = await openCheckout(page);
  await dialog.getByLabel("Tu nombre", { exact: true }).fill("María Pérez");
  await dialog.getByLabel("Teléfono para coordinar").fill("abcdefghi");
  await dialog.getByLabel("Fecha deseada").fill("2099-09-30");
  await dialog
    .getByRole("button", { name: "Finalizar pedido por WhatsApp" })
    .click();
  await expect(dialog.getByRole("alert")).toBeFocused();
  await expect(dialog.getByRole("alert")).toContainText("teléfono");
  await expect(dialog.getByLabel("Tu nombre", { exact: true })).toHaveValue(
    "María Pérez",
  );
  await expect(dialog.locator(".checkout-review li")).toContainText(
    "1 × Torta de chocolate",
  );
});

test("checkout fits narrow, landscape and zoom-sized viewports", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The desktop project checks every viewport.",
  );
  const dialog = await openCheckout(page);
  await dialog.getByRole("radio", { name: "Delivery", exact: true }).check();
  await dialog
    .getByLabel("Distrito y dirección")
    .fill(
      "Dirección extensa para coordinar en Ventanilla, referencia junto al parque de la urbanización",
    );
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 720, height: 500 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    const dimensions = await dialog.evaluate((element) => ({
      content: element.scrollWidth,
      visible: element.clientWidth,
    }));
    expect(dimensions.content, JSON.stringify(viewport)).toBeLessThanOrEqual(
      dimensions.visible + 1,
    );
    const date = dialog.getByLabel("Fecha deseada");
    await date.focus();
    const field = await date.boundingBox();
    const modal = await dialog.boundingBox();
    expect(field).not.toBeNull();
    expect(field!.y).toBeGreaterThanOrEqual(modal!.y);
    expect(field!.y + field!.height).toBeLessThanOrEqual(
      modal!.y + modal!.height,
    );
    for (const control of [
      dialog.getByRole("button", { name: "Cerrar carrito" }),
      dialog.locator(".checkout-extra summary"),
      dialog.getByRole("button", { name: "Editar", exact: true }),
    ]) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
});
