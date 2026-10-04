import { test, expect } from "@playwright/test";

// Software WebGL makes the actual shader path testable on runners without a GPU.
test.use({
  launchOptions: {
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  },
});

test("curved gallery renders photos, supports drag and keyboard, and opens the shopping detail", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const gallery = page.locator(".wave-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-mode", "webgl", {
    timeout: 20000,
  });
  const painted = await gallery.locator("canvas").evaluate(
    (element) =>
      new Promise<number>((resolve) => {
        requestAnimationFrame(() => {
          const canvas = element as HTMLCanvasElement;
          const gl = canvas.getContext("webgl")!;
          const pixels = new Uint8Array(16 * 16 * 4);
          gl.readPixels(
            Math.floor(canvas.width / 2) - 8,
            Math.floor(canvas.height / 2) - 8,
            16,
            16,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
          resolve(
            pixels
              .filter((_, index) => index % 4 === 3)
              .reduce((sum, value) => sum + value, 0),
          );
        });
      }),
  );
  expect(painted).toBeGreaterThan(0);
  await gallery.getByRole("button", { name: "Pausar galería" }).click();
  await expect(
    gallery.getByRole("button", { name: "Reanudar galería" }),
  ).toHaveAttribute("aria-pressed", "true");
  await gallery
    .getByRole("button", { name: "Mostrar Torta de chocolate", exact: true })
    .click();
  await expect(gallery).toHaveAttribute("data-selected", "torta-chocolate");
  const stage = gallery.getByRole("group");
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  const startX = bounds.x + bounds.width * 0.7;
  const endX = bounds.x + bounds.width * 0.15;
  const y = bounds.y + bounds.height * 0.5;
  if (testInfo.project.name === "mobile") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y }],
    });
    for (let step = 1; step <= 12; step++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + ((endX - startX) * step) / 12, y }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 12 });
    await page.mouse.up();
  }
  await expect(gallery).not.toHaveAttribute("data-selected", "torta-chocolate");
  await stage.focus();
  await stage.press("Home");
  await expect(gallery).toHaveAttribute("data-selected", "torta-chocolate");
  await stage.press("ArrowRight");
  await expect(gallery).toHaveAttribute("data-selected", "terremoto-lucuma");
  await gallery
    .getByRole("button", { name: "Mostrar Cheesecake de fresa" })
    .click();
  await expect(gallery).toHaveAttribute("data-selected", "cheesecake-fresa");
  await gallery.screenshot({
    path: `test-results/yemape-wave-${testInfo.project.name}.png`,
  });
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((element) => element.clientWidth),
  );
  const open = gallery.getByRole("button", {
    name: "Descubrir Cheesecake de fresa en destacados",
  });
  await open.click();
  const detail = page.getByRole("dialog", {
    name: "Cheesecake de fresa",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: /^Agregar 1 al carrito/ }).click();
  await expect(detail).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect(
    page.getByRole("button", {
      name: "Abrir carrito, 1 productos",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion keeps photos and selection available without a canvas", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const gallery = page.locator(".wave-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-mode", "static");
  await expect(gallery.locator("canvas")).toBeHidden();
  await expect(
    gallery.getByRole("button", { name: /Pausar galería|Reanudar galería/ }),
  ).toHaveCount(0);
  await gallery
    .getByRole("button", { name: "Mostrar Keke de arándanos" })
    .click();
  await expect(gallery).toHaveAttribute("data-selected", "keke-arandanos");
  await gallery
    .getByRole("button", { name: "Descubrir Keke de arándanos en destacados" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Keke de arándanos", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await gallery.screenshot({
    path: `test-results/yemape-wave-reduced-${testInfo.project.name}.png`,
  });
});

test("WebGL unavailability leaves a usable photographic gallery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl" || type === "webgl2") return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await page.goto("/");
  const gallery = page.locator(".wave-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery.getByRole("listitem")).toHaveCount(6);
  await gallery
    .getByRole("button", { name: "Mostrar Cheesecake de maracumango" })
    .click();
  await expect(gallery).toHaveAttribute(
    "data-selected",
    "cheesecake-maracumango",
  );
  await gallery
    .getByRole("button", {
      name: "Ver detalles de Cheesecake de maracumango",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Cheesecake de maracumango",
      exact: true,
    }),
  ).toBeVisible();
});
