import { test, expect } from "@playwright/test";

test("expanded photos support zoom, Escape and focus return", async ({
  page,
}) => {
  await page.goto("/postres/torta-chocolate");
  const trigger = page.getByRole("button", {
    name: "Ampliar fotografía de Torta de chocolate",
  });
  await trigger.click();
  const photo = page.getByRole("dialog", {
    name: "Fotografías de Torta de chocolate",
  });
  await expect(photo).toBeVisible();
  await expect
    .poll(() =>
      photo
        .locator("img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await photo.getByRole("button", { name: "Acercar fotografía" }).click();
  await expect(
    photo.getByRole("button", { name: "Ver foto completa" }),
  ).toHaveAttribute("aria-pressed", "true");
  const size = await photo
    .locator(".photo-lightbox-viewport")
    .evaluate((element) => ({
      width: element.clientWidth,
      scroll: element.scrollWidth,
    }));
  expect(size.scroll).toBeGreaterThan(size.width);
  await photo.getByRole("button", { name: "Ver foto completa" }).click();
  await expect(photo.locator(".photo-lightbox-image")).not.toHaveClass(
    /is-zoomed/,
  );
  await page.keyboard.press("Escape");
  await expect(photo).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(
    await page.locator("body").evaluate((element) => element.style.overflow),
  ).not.toBe("hidden");
});

test("closing a nested photo preserves the quick view and its scroll lock", async ({
  page,
}) => {
  await page.goto("/catalogo");
  const trigger = page.getByRole("button", {
    name: "Ver detalles de Torta de chocolate",
    exact: true,
  });
  await trigger.click();
  const quick = page.getByRole("dialog", {
    name: "Torta de chocolate",
    exact: true,
  });
  const photoTrigger = quick.getByRole("button", {
    name: "Ampliar fotografía de Torta de chocolate",
  });
  await photoTrigger.click();
  await expect(page.locator("dialog[open]")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(photoTrigger).toBeFocused();
  expect(
    await page.locator("body").evaluate((element) => element.style.overflow),
  ).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(quick).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(
    await page.locator("body").evaluate((element) => element.style.overflow),
  ).not.toBe("hidden");
});

test("mobile purchase action follows presentation and quantity without duplicate docks", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile purchase action only.");
  await page.goto("/postres/torta-chocolate");
  await page.getByRole("radio", { name: /Grande/ }).check();
  await page
    .getByRole("button", { name: "Aumentar cantidad del producto" })
    .click();
  const dock = page.getByLabel("Compra rápida del producto", { exact: true });
  await expect(dock).toBeVisible();
  await expect(dock).toContainText("Grande");
  await expect(dock.locator("strong")).toHaveText("S/ 250.00");
  await dock
    .getByRole("button", {
      name: "Agregar 2 de Torta de chocolate desde la barra de compra",
    })
    .click();
  await expect(page.locator(".mobile-cart-dock")).toHaveCount(0);
  await dock
    .getByRole("button", { name: "Ver carrito desde la ficha, 2 productos" })
    .click();
  const cart = page.getByRole("dialog", { name: "Tu carrito", exact: true });
  await expect(cart.locator(".cart-item")).toContainText("Grande");
  await expect(cart.locator(".quantity span")).toHaveText("2");
  await expect(cart.locator(".cart-total strong")).toHaveText("S/ 250.00");
});

test("cart summary remains reachable with several products and an empty selection", async ({
  page,
}, testInfo) => {
  for (const id of [
    "torta-chocolate",
    "pie-limon",
    "brownie-chocolate",
    "keke-arandanos",
  ]) {
    await page.goto(`/postres/${id}`);
    await page
      .getByRole("button", { name: "Agregar 1 al carrito", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Abrir carrito, 4 productos" })
    .click();
  const cart = page.getByRole("dialog", { name: "Tu carrito", exact: true });
  await expect(cart.locator(".cart-item")).toHaveCount(4);
  await cart.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  const bounds = await cart.boundingBox();
  const viewport = page.viewportSize()!;
  expect(
    Math.abs(bounds!.x + bounds!.width - viewport.width),
  ).toBeLessThanOrEqual(2);
  expect(Math.abs(bounds!.height - viewport.height)).toBeLessThanOrEqual(2);
  if (testInfo.project.name === "mobile") expect(bounds!.x).toBe(0);
  const summary = cart.locator(".cart-summary");
  const before = await summary.boundingBox();
  await cart
    .locator(".cart-selection")
    .evaluate((element) => element.scrollTo(0, element.scrollHeight));
  const after = await summary.boundingBox();
  expect(after!.y).toBe(before!.y);
  await expect(
    summary.getByRole("button", { name: "Continuar como invitado" }),
  ).toBeInViewport();
  await summary
    .getByRole("button", { name: "Continuar como invitado" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Los detalles de tu pedido" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Revisar mi carrito/ }).click();
  for (let left = 4; left > 0; left--)
    await cart
      .getByRole("button", { name: /^Eliminar / })
      .first()
      .click();
  await expect(
    cart.getByRole("heading", { name: "Aquí comienza tu antojo" }),
  ).toBeVisible();
  await cart.getByRole("button", { name: "Explorar la carta" }).click();
  await expect(cart).toBeHidden();
});
