import type { CartItem, Product, CheckoutDetails } from "./types";
export const CART_KEY = "yemape-cart-v1";
export const MAX_QUANTITY = 20;
export const WHATSAPP = "51934219749";
export function money(cents: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(cents / 100);
}
export function normalizeCart(value: unknown, products: Product[]): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result = new Map<string, number>();
  for (const row of value.slice(0, 200)) {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.id !== "string" ||
      !Number.isInteger(row.quantity) ||
      row.quantity < 1
    )
      continue;
    if (!products.some((p) => p.id === row.id && p.active)) continue;
    result.set(
      row.id,
      Math.min(MAX_QUANTITY, (result.get(row.id) ?? 0) + row.quantity),
    );
  }
  return [...result].map(([id, quantity]) => ({ id, quantity }));
}
export function cartSummary(cart: CartItem[], products: Product[]) {
  const lines = normalizeCart(cart, products).map((item) => ({
    ...item,
    product: products.find((p) => p.id === item.id)!,
  }));
  return {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce(
      (n, l) => n + (l.product.price_cents ?? 0) * l.quantity,
      0,
    ),
    unpriced: lines.some((l) => l.product.price_cents === null),
  };
}
export function limaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function checkoutError(d: CheckoutDetails, today = limaToday()) {
  if (d.name.trim().length < 2 || d.name.trim().length > 100)
    return "Escribe tu nombre (entre 2 y 100 caracteres).";
  if (!["recojo", "delivery"].includes(d.delivery))
    return "Elige recojo o delivery.";
  if (!validDate(d.date) || d.date < today)
    return "Elige una fecha válida, a partir de hoy.";
  if (
    d.delivery === "delivery" &&
    (d.address.trim().length < 8 || d.address.trim().length > 250)
  )
    return "Indica tu distrito y dirección de entrega (8 a 250 caracteres).";
  if (d.notes.length > 500)
    return "Las observaciones no pueden superar 500 caracteres.";
  return null;
}
export function whatsappUrl(
  cart: CartItem[],
  products: Product[],
  details: CheckoutDetails,
) {
  const error = checkoutError(details);
  if (error) throw new Error(error);
  const { lines, subtotal, unpriced } = cartSummary(cart, products);
  if (!lines.length) throw new Error("Agrega un producto antes de continuar.");
  const date = details.date.split("-").reverse().join("/");
  const message = [
    "¡Hola, Repostería Yemape! Quisiera coordinar este pedido:",
    "",
    ...lines.map(
      (l) =>
        `• ${l.quantity} × ${l.product.name} — ${l.product.presentation}: ${l.product.price_cents === null ? "precio por consultar" : money(l.product.price_cents * l.quantity)}`,
    ),
    "",
    unpriced
      ? subtotal > 0
        ? `Subtotal de productos con precio: ${money(subtotal)}. Faltan productos por cotizar.`
        : "Importe de productos: por cotizar."
      : `Subtotal de productos: ${money(subtotal)}`,
    `Nombre: ${details.name.trim()}`,
    `Modalidad: ${details.delivery === "delivery" ? "Delivery" : "Recojo"}`,
    details.delivery === "delivery"
      ? `Dirección: ${details.address.trim()}`
      : "Punto de recojo: por coordinar.",
    `Fecha solicitada: ${date}`,
    details.notes.trim() ? `Observaciones: ${details.notes.trim()}` : "",
    "",
    "Por favor, confirmar disponibilidad, presentación, importe final y forma de pago.",
    details.delivery === "delivery" ? "Delivery: costo por confirmar." : "",
    "Este mensaje es una solicitud; el pedido aún no está confirmado.",
  ]
    .filter((x) => x !== undefined)
    .join("\n");
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}
export function parsePrice(value: string, optional = false): number | null {
  if (optional && value.trim() === "") return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("Usa un importe válido, con hasta dos decimales.");
  return Math.round(Number(value) * 100);
}
