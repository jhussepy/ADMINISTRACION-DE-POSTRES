import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCart,
  cartSummary,
  checkoutError,
  whatsappUrl,
  limaToday,
  validDate,
  parsePrice,
} from "../lib/cart";
import { initialProducts } from "../lib/products";
import type { CheckoutDetails } from "../lib/types";
const details: CheckoutDetails = {
  name: "María & José",
  phone: "934 219 749",
  delivery: "delivery",
  address: "Ventanilla, calle 123",
  date: "2099-09-30",
  notes: "Cumpleaños + fresas",
};
test("normalizes corrupt storage, duplicate lines, removed products and quantities", () => {
  assert.deepEqual(normalizeCart(null, initialProducts), []);
  assert.deepEqual(
    normalizeCart(
      [
        { id: "cheesecake-fresa", quantity: 12 },
        { id: "cheesecake-fresa", quantity: 15 },
        { id: "unknown", quantity: 1 },
        { id: "triples", quantity: -1 },
        { id: "torta-personalizada", quantity: 1.5 },
      ],
      initialProducts,
    ),
    [{ id: "cheesecake-fresa", variant: "porcion", quantity: 20 }],
  );
  assert.deepEqual(
    normalizeCart(
      [{ id: "triples", quantity: 2 }],
      initialProducts.map((p) => ({ ...p, active: false })),
    ),
    [],
  );
});
test("integer cents avoid rounding errors and unpriced products never become free", () => {
  const products = initialProducts.map((p) => ({
    ...p,
    price_cents: p.id === "cheesecake-fresa" ? 1010 : null,
  }));
  const s = cartSummary(
    [
      { id: "cheesecake-fresa", quantity: 3 },
      { id: "torta-personalizada", quantity: 2 },
    ],
    products,
  );
  assert.equal(s.subtotal, 3030);
  assert.equal(s.count, 5);
  assert.equal(s.unpriced, true);
  assert.equal(s.examples, false);
  assert.equal(parsePrice("10.10"), 1010);
  assert.equal(parsePrice("", true), null);
  for (const input of ["-1", "1e3", "0.001", "abc", "Infinity"])
    assert.throws(() => parsePrice(input));
});
test("Lima day boundary and real dates", () => {
  assert.equal(limaToday(new Date("2026-09-27T02:00:00Z")), "2026-09-26");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2027-02-29"), false);
  assert.equal(
    checkoutError({ ...details, date: "2026-09-25" }, "2026-09-26"),
    "Elige una fecha válida, a partir de hoy.",
  );
  assert.equal(
    checkoutError({ ...details, date: "2026-09-26" }, "2026-09-26"),
    null,
  );
});
test("delivery needs address while collection does not", () => {
  assert.ok(checkoutError({ ...details, address: "" }));
  assert.equal(
    checkoutError({ ...details, delivery: "recojo", address: "" }),
    null,
  );
  assert.ok(checkoutError({ ...details, notes: "x".repeat(501) }));
});
test("WhatsApp uses correct recipient and encodes accents, plus signs and newlines", () => {
  const url = new URL(
    whatsappUrl(
      [{ id: "cheesecake-fresa", quantity: 2 }],
      initialProducts,
      details,
    ),
  );
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/51934219749");
  const text = url.searchParams.get("text")!;
  assert.match(text, /María & José/);
  assert.match(text, /Teléfono: 934 219 749/);
  assert.match(text, /Cumpleaños \+ fresas/);
  assert.match(text, /2 × Cheesecake de fresa/);
  assert.match(text, /Estimado de muestra/);
  assert.match(text, /no son precios finales/);
  assert.match(text, /aún no está confirmado/);
  assert.match(text, /Delivery: costo por confirmar/);
  assert.ok(text.includes("\n"));
  assert.throws(() => whatsappUrl([], initialProducts, details));
});

test("WhatsApp includes the Yemape order code after automatic registration", () => {
  const message = new URL(
    whatsappUrl(
      [{ id: "cheesecake-fresa", quantity: 1 }],
      initialProducts,
      details,
      "YMP-2099-0001",
    ),
  ).searchParams.get("text")!;
  assert.match(message, /Código de pedido: YMP-2099-0001/);
  assert.match(message, /solicitud ya quedó registrada en Yemape/i);
});
test("separate presentations survive cart normalization and cannot be forged", () => {
  const cart = normalizeCart(
    [
      { id: "pie-limon", variant: "porcion", quantity: 2 },
      { id: "pie-limon", variant: "entero", quantity: 1 },
      { id: "pie-limon", variant: "inventada", quantity: 1 },
    ],
    initialProducts,
  );
  assert.deepEqual(cart, [
    { id: "pie-limon", variant: "porcion", quantity: 2 },
    { id: "pie-limon", variant: "entero", quantity: 1 },
  ]);
  const summary = cartSummary(cart, initialProducts);
  assert.equal(summary.count, 3);
  assert.equal(summary.subtotal, 11000);
  assert.equal(summary.examples, true);
  const message = new URL(
    whatsappUrl(cart, initialProducts, details),
  ).searchParams.get("text")!;
  assert.match(message, /2 × Pie de limón — Porción/);
  assert.match(message, /1 × Pie de limón — Entero/);
  assert.match(message, /importes y presentaciones de ejemplo/);
});
test("gift note and occasion are included but cannot exceed limits", () => {
  const order = {
    ...details,
    occasion: "Cumpleaños",
    giftNote: "¡Feliz día, Ana!",
  };
  assert.equal(checkoutError(order, "2099-09-30"), null);
  const message = new URL(
    whatsappUrl([{ id: "pie-manzana", quantity: 1 }], initialProducts, order),
  ).searchParams.get("text")!;
  assert.match(message, /Ocasión: Cumpleaños/);
  assert.match(message, /Dedicatoria solicitada: ¡Feliz día, Ana!/);
  assert.ok(
    checkoutError({ ...order, giftNote: "x".repeat(181) }, "2099-09-30"),
  );
});
test("personalized cake requires guests and carries its details to WhatsApp", () => {
  const custom = {
    ...details,
    delivery: "recojo" as const,
    address: "",
    cakeGuests: "12",
    cakeFlavor: "Chocolate",
    cakeDesign: "Flores pastel",
  };
  assert.match(
    checkoutError({ ...custom, cakeGuests: "" }, "2099-09-30", true)!,
    /cuántas personas/,
  );
  assert.match(
    checkoutError({ ...custom, cakeGuests: "501" }, "2099-09-30", true)!,
    /cuántas personas/,
  );
  assert.equal(checkoutError(custom, "2099-09-30", true), null);
  const url = new URL(
    whatsappUrl(
      [{ id: "torta-personalizada", quantity: 1 }],
      initialProducts,
      custom,
    ),
  );
  const message = url.searchParams.get("text")!;
  assert.match(message, /Personas: 12/);
  assert.match(message, /Sabor deseado: Chocolate/);
  assert.match(message, /Diseño o temática: Flores pastel/);
  assert.throws(() =>
    whatsappUrl([{ id: "torta-personalizada", quantity: 1 }], initialProducts, {
      ...custom,
      cakeGuests: "",
    }),
  );
});


test("real Supabase variants override demo presentations and checkout validation", () => {
  const products = initialProducts.map((product) =>
    product.id === "torta-chocolate"
      ? {
          ...product,
          variants: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              product_id: product.id,
              slug: "familiar",
              label: "Familiar · 20 porciones",
              price_cents: 15000,
              active: true,
              sort_order: 1,
            },
            {
              id: "22222222-2222-4222-8222-222222222222",
              product_id: product.id,
              slug: "oculta",
              label: "Presentación interna",
              price_cents: 1,
              active: false,
              sort_order: 2,
            },
          ],
        }
      : product,
  );

  const cart = normalizeCart(
    [
      { id: "torta-chocolate", variant: "familiar", quantity: 2 },
      { id: "torta-chocolate", variant: "mediana", quantity: 1 },
      { id: "torta-chocolate", variant: "oculta", quantity: 1 },
    ],
    products,
  );

  assert.deepEqual(cart, [
    { id: "torta-chocolate", variant: "familiar", quantity: 2 },
  ]);

  const summary = cartSummary(cart, products);
  assert.equal(summary.subtotal, 30000);
  assert.equal(summary.examples, false);

  const message = new URL(
    whatsappUrl(cart, products, details),
  ).searchParams.get("text")!;
  assert.match(message, /2 × Torta de chocolate — Familiar · 20 porciones/);
  assert.doesNotMatch(message, /Familiar · 20 porciones:.*\(ejemplo\)/i);
  assert.doesNotMatch(message, /IMPORTANTE: importes y presentaciones de ejemplo/i);
  assert.doesNotMatch(message, /Presentación interna/);
});
