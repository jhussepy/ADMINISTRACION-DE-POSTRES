import type { CartItem, Product, CheckoutDetails } from "./types";
import { DEMO_MODE, presentation } from "./demo-catalog";
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
  const result = new Map<string, CartItem>();
  const totals = new Map<string, number>();
  for (const row of value.slice(0, 200)) {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.id !== "string" ||
      !Number.isInteger(row.quantity) ||
      row.quantity < 1
    )
      continue;
    const product = products.find((p) => p.id === row.id && p.active);
    if (
      !product ||
      (row.variant !== undefined && typeof row.variant !== "string")
    )
      continue;
    const offer = presentation(product, row.variant);
    if (!offer) continue;
    const available = MAX_QUANTITY - (totals.get(row.id) ?? 0);
    if (available <= 0) continue;
    const accepted = Math.min(row.quantity, available);
    const key = `${row.id}:${offer.id}`;
    const previous = result.get(key);
    result.set(key, {
      id: row.id,
      variant: offer.id,
      quantity: (previous?.quantity ?? 0) + accepted,
    });
    totals.set(row.id, (totals.get(row.id) ?? 0) + accepted);
  }
  return [...result.values()];
}
export function cartSummary(cart: CartItem[], products: Product[]) {
  const lines = normalizeCart(cart, products).map((item) => {
    const product = products.find((p) => p.id === item.id)!;
    return { ...item, product, offer: presentation(product, item.variant)! };
  });
  return {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce(
      (n, l) => n + (l.offer.priceCents ?? 0) * l.quantity,
      0,
    ),
    unpriced: lines.some((l) => l.offer.priceCents === null),
    examples: lines.some((l) => l.offer.example),
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
export function checkoutError(
  d: CheckoutDetails,
  today = limaToday(),
  hasCustomCake = false,
) {
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
  if ((d.occasion?.length ?? 0) > 80 || (d.giftNote?.length ?? 0) > 180)
    return "Revisa la ocasión y la dedicatoria (máximo 80 y 180 caracteres).";
  if (hasCustomCake) {
    const guests = d.cakeGuests?.trim() ?? "";
    if (!/^[1-9]\d{0,2}$/.test(guests) || Number(guests) > 500)
      return "Indica para cuántas personas será la torta (entre 1 y 500).";
    if ((d.cakeFlavor?.length ?? 0) > 80)
      return "El sabor de la torta no puede superar 80 caracteres.";
    if ((d.cakeDesign?.length ?? 0) > 300)
      return "La idea de la torta no puede superar 300 caracteres.";
  }
  return null;
}
export function whatsappUrl(
  cart: CartItem[],
  products: Product[],
  details: CheckoutDetails,
) {
  const hasCustomCake = cart.some((item) => item.id === "torta-personalizada");
  const error = checkoutError(details, limaToday(), hasCustomCake);
  if (error) throw new Error(error);
  const { lines, subtotal, unpriced, examples } = cartSummary(cart, products);
  if (!lines.length) throw new Error("Agrega un producto antes de continuar.");
  const date = details.date.split("-").reverse().join("/");
  const message = [
    "¡Hola, Repostería Yemape! Quisiera coordinar este pedido:",
    "",
    ...lines.map(
      (l) =>
        `• ${l.quantity} × ${l.product.name} — ${l.offer.label}: ${l.offer.priceCents === null ? "precio por consultar" : `${money(l.offer.priceCents * l.quantity)}${l.offer.example ? " (ejemplo)" : ""}`}`,
    ),
    "",
    unpriced
      ? subtotal > 0
        ? `${examples ? "Estimado de muestra" : "Subtotal de productos con precio"}: ${money(subtotal)}. Faltan productos por cotizar.`
        : "Importe de productos: por cotizar."
      : `${examples ? "Estimado de muestra" : "Subtotal de productos"}: ${money(subtotal)}`,
    examples
      ? "IMPORTANTE: importes y presentaciones de ejemplo; no son precios finales. Confirmar cotización real."
      : undefined,
    `Nombre: ${details.name.trim()}`,
    `Modalidad: ${details.delivery === "delivery" ? "Delivery" : "Recojo"}`,
    details.delivery === "delivery"
      ? `Dirección: ${details.address.trim()}`
      : "Punto y horario de recojo: por confirmar.",
    details.delivery === "delivery"
      ? DEMO_MODE
        ? "Cobertura y costo de envío: por confirmar (los ejemplos de la web no son tarifas)."
        : "Cobertura y costo de envío: por confirmar."
      : undefined,
    `Fecha solicitada: ${date}`,
    details.occasion?.trim()
      ? `Ocasión: ${details.occasion.trim()}`
      : undefined,
    details.giftNote?.trim()
      ? `Dedicatoria solicitada: ${details.giftNote.trim()}`
      : undefined,
    hasCustomCake ? "Torta personalizada:" : undefined,
    hasCustomCake ? `Personas: ${details.cakeGuests!.trim()}` : undefined,
    hasCustomCake && details.cakeFlavor?.trim()
      ? `Sabor deseado: ${details.cakeFlavor.trim()}`
      : undefined,
    hasCustomCake && details.cakeDesign?.trim()
      ? `Diseño o temática: ${details.cakeDesign.trim()}`
      : undefined,
    details.notes.trim() ? `Observaciones: ${details.notes.trim()}` : undefined,
    "",
    "Por favor, confirmar disponibilidad, presentación, importe final y forma de pago.",
    details.delivery === "delivery"
      ? "Delivery: costo por confirmar."
      : undefined,
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
