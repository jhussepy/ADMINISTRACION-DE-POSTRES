import type { CustomerOrderSummary } from "./types";

export function normalizeCustomerPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (/^0051\d{9}$/.test(digits)) digits = digits.slice(4);
  else if (/^51\d{9}$/.test(digits)) digits = digits.slice(2);
  return digits;
}

export function customerOrderStats(orders: CustomerOrderSummary[]) {
  const activeStatuses = new Set([
    "Nuevo",
    "Por confirmar",
    "Confirmado",
    "En preparación",
    "Listo",
  ]);

  const deliveryCounts = orders.reduce(
    (acc, order) => {
      if (order.delivery_method === "delivery") acc.delivery += 1;
      if (order.delivery_method === "recojo") acc.recojo += 1;
      return acc;
    },
    { delivery: 0, recojo: 0 },
  );

  const preferredDelivery =
    deliveryCounts.delivery === 0 && deliveryCounts.recojo === 0
      ? null
      : deliveryCounts.delivery > deliveryCounts.recojo
        ? "delivery"
        : deliveryCounts.recojo > deliveryCounts.delivery
          ? "recojo"
          : null;

  const sorted = orders
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    total: orders.length,
    active: orders.filter((order) => activeStatuses.has(order.status)).length,
    delivered: orders.filter((order) => order.status === "Entregado").length,
    quotePending: orders.filter(
      (order) => order.quote_required && order.status !== "Cancelado",
    ).length,
    preferredDelivery,
    lastOrder: sorted[0] ?? null,
  };
}

export function safeCrmSearch(value?: string) {
  return (value ?? "")
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
