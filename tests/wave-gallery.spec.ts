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
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/_next/image")
      imageRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const draw = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (
      ...args: Parameters<typeof draw>
    ) {
      draw.apply(this, args);
      const canvas = this.canvas as HTMLCanvasElement;
      if (canvas.dataset.paintedAlpha !== undefined) return;
      if (this.drawingBufferWidth < 16 || this.drawingBufferHeight < 16) return;
      // Read the actual draw before the compositor clears a non-preserved
      // drawing buffer. Capped animation need not draw on every browser frame.
      const pixels = new Uint8Array(16 * 16 * 4);
      this.readPixels(
        Math.floor(this.drawingBufferWidth / 2) - 8,
        Math.floor(this.drawingBufferHeight / 2) - 8,
        16,
        16,
        this.RGBA,
        this.UNSIGNED_BYTE,
        pixels,
      );
      const alpha = pixels
        .filter((_, i) => i % 4 === 3)
        .reduce((sum, v) => sum + v, 0);
      if (alpha > 0) canvas.dataset.paintedAlpha = String(alpha);
    };
    const original = WebGLRenderingContext.prototype.texImage2D;
    WebGLRenderingContext.prototype.texImage2D = function (
      this: WebGLRenderingContext,
      ...args: unknown[]
    ) {
      const source = args[args.length - 1];
      if (source instanceof HTMLImageElement) {
        const canvas = this.canvas as HTMLCanvasElement;
        const uploads = JSON.parse(canvas.dataset.textureSources ?? "[]");
        uploads.push({
          src: source.currentSrc,
          reused: !!source.closest(".wave-static-list"),
        });
        canvas.dataset.textureSources = JSON.stringify(uploads);
      }
      return original.apply(this, args as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/");
  const gallery = page.locator(".wave-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () => ({
        mode: await gallery.getAttribute("data-mode"),
        error: await gallery
          .locator("canvas")
          .getAttribute("data-renderer-error"),
      }),
      { timeout: 20000 },
    )
    .toMatchObject({ mode: "webgl" });
  const sources = await gallery
    .locator(".wave-static-list img")
    .evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).currentSrc),
    );
  const uploads = JSON.parse(
    (await gallery.locator("canvas").getAttribute("data-texture-sources"))!,
  );
  expect(uploads).toHaveLength(sources.length);
  expect(uploads).toEqual(
    expect.arrayContaining(sources.map((src) => ({ src, reused: true }))),
  );
  // Other home sections can also display a featured photo at their own size.
  // Every requested variant must belong to an actual responsive DOM image.
  const domSources = await page
    .locator("img")
    .evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).currentSrc),
    );
  for (const src of sources) {
    const asset = new URL(src).searchParams.get("url");
    if (!asset) continue;
    const requests = imageRequests.filter(
      (url) => new URL(url).searchParams.get("url") === asset,
    );
    expect(requests).toContain(src);
    for (const url of requests) expect(domSources).toContain(url);
  }
  await expect
    .poll(async () =>
      Number(
        await gallery.locator("canvas").getAttribute("data-painted-alpha"),
      ),
    )
    .toBeGreaterThan(0);
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
  // Wait for the real scroll destination: desktop clamps the last cards to the
  // end of the list, which must not replace the explicitly chosen dessert.
  const list = gallery.locator(".wave-static-list");
  await expect
    .poll(() =>
      list.evaluate((element) => {
        const card = element.querySelector<HTMLElement>(
          '[data-wave-card="4"]',
        )!;
        const destination = Math.min(
          card.offsetLeft - (element as HTMLElement).offsetLeft,
          element.scrollWidth - element.clientWidth,
        );
        return Math.abs(element.scrollLeft - destination);
      }),
    )
    .toBeLessThanOrEqual(1);
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
  await page.keyboard.press("Escape");
  await list.hover();
  await page.mouse.wheel(-5000, 0);
  await expect(gallery).toHaveAttribute("data-selected", "torta-chocolate");
  await gallery
    .getByRole("button", { name: "Postre siguiente", exact: true })
    .click();
  await expect(gallery).toHaveAttribute("data-selected", "terremoto-lucuma");
  await gallery
    .getByRole("button", {
      name: "Descubrir Terremoto de lúcuma en destacados",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Terremoto de lúcuma", exact: true }),
  ).toBeVisible();
});
