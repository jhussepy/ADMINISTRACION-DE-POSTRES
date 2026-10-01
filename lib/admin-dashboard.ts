import type { Order } from "./types";

const ACTIVE_STATUSES = new Set([
  "Nuevo",
  "Por confirmar",
  "Confirmado",
  "En preparación",
  "Listo",
]);

export function shiftIsoDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function operationalOrderMetrics(orders: Order[], today: string) {
  const tomorrow = shiftIsoDate(today, 1);
  const active = orders.filter((order) => ACTIVE_STATUSES.has(order.status));
  const financiallyConfirmed = orders.filter(
    (order) =>
      ["Confirmado", "En preparación", "Listo", "Entregado"].includes(
        order.status,
      ) && !order.quote_required,
  );

  return {
    attention: active.filter((order) =>
      ["Nuevo", "Por confirmar"].includes(order.status),
    ).length,
    production: active.filter((order) =>
      ["Confirmado", "En preparación", "Listo"].includes(order.status),
    ).length,
    today: active.filter((order) => order.delivery_date === today).length,
    tomorrow: active.filter((order) => order.delivery_date === tomorrow).length,
    quotes: active.filter((order) => order.quote_required).length,
    confirmedAmount: financiallyConfirmed.reduce(
      (sum, order) => sum + order.total_cents,
      0,
    ),
    outstanding: financiallyConfirmed.reduce(
      (sum, order) => sum + Math.max(0, order.total_cents - order.deposit_cents),
      0,
    ),
  };
}

export function monthBounds(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month))
    throw new Error("Mes inválido.");

  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12)
    throw new Error("Mes inválido.");

  const start = `${year.toString().padStart(4, "0")}-${monthNumber
    .toString()
    .padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const end = `${year.toString().padStart(4, "0")}-${monthNumber
    .toString()
    .padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;

  return { start, end, year, monthNumber, lastDay };
}

export function shiftMonth(month: string, amount: number) {
  const { year, monthNumber } = monthBounds(month);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

export function calendarLeadingDays(month: string) {
  const { year, monthNumber } = monthBounds(month);
  const sundayBased = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  return (sundayBased + 6) % 7;
}

export function isOperationalOrder(order: Order) {
  return ACTIVE_STATUSES.has(order.status);
}
