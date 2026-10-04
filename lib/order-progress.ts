import type { Order } from "./types";
import { normalizeCustomerPhone } from "./crm";

export const orderProgress = [
  "Nuevo",
  "Por confirmar",
  "Confirmado",
  "En preparación",
  "Listo",
  "Entregado",
] as const;

type OrderStatus = Order["status"];

export const customerStatusCopy: Record<
  OrderStatus,
  { title: string; description: string }
> = {
  Nuevo: {
    title: "Solicitud recibida",
    description: "Recibimos tu solicitud y revisaremos los detalles contigo.",
  },
  "Por confirmar": {
    title: "Por confirmar",
    description:
      "Estamos confirmando el precio, la fecha y los detalles del pedido.",
  },
  Confirmado: {
    title: "Pedido confirmado",
    description:
      "Acordamos tu pedido. Te avisaremos cuando iniciemos la preparación.",
  },
  "En preparación": {
    title: "En preparación",
    description: "Estamos preparando tus postres.",
  },
  Listo: {
    title: "Pedido listo",
    description:
      "Tu pedido está listo. Coordina la entrega o el recojo con Yemape.",
  },
  Entregado: {
    title: "Pedido entregado",
    description: "Tu pedido fue entregado. ¡Gracias por elegir Yemape!",
  },
  Cancelado: {
    title: "Pedido cancelado",
    description:
      "Este pedido fue cancelado. Si tienes alguna consulta, escríbenos.",
  },
};

export function nextOrderStatus(status: OrderStatus) {
  const index = orderProgress.findIndex((item) => item === status);
  return index >= 0 && index < orderProgress.length - 1
    ? orderProgress[index + 1]
    : null;
}

export function nextStatusAction(status: OrderStatus) {
  const next = nextOrderStatus(status);
  if (!next) return null;
  if (next === "Por confirmar") return "Revisar pedido";
  if (next === "Confirmado") return "Confirmar pedido";
  if (next === "En preparación") return "Iniciar preparación";
  if (next === "Listo") return "Marcar listo";
  return "Marcar entregado";
}

export function customerWhatsappNumber(phone: string) {
  const digits = normalizeCustomerPhone(phone);
  if (/^9\d{8}$/.test(digits)) return "51" + digits;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function orderStatusWhatsappMessage(
  code: string,
  status: OrderStatus,
  trackingUrl?: string,
) {
  const copy = customerStatusCopy[status];
  return [
    "Hola, te escribimos de Repostería Yemape 🍰",
    `Tu pedido *${code}* ahora está: *${copy.title}*.`,
    copy.description,
    trackingUrl
      ? `Consulta su estado actualizado aquí: ${trackingUrl}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}
