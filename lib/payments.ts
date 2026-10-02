import type { Payment, PaymentMethod, PaymentStatus } from "./types";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia bancaria",
  efectivo: "Efectivo",
  mercadopago: "Mercado Pago",
  otro: "Otro",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  rejected: "Rechazado",
  refunded: "Reembolsado",
  failed: "Fallido",
};

export function paymentMethodLabel(method: PaymentMethod) {
  return paymentMethodLabels[method];
}

export function paymentStatusLabel(status: PaymentStatus) {
  return paymentStatusLabels[status];
}

export function paymentStatusClass(status: PaymentStatus) {
  if (status === "confirmed") return "is-confirmed";
  if (status === "pending") return "is-pending";
  if (status === "refunded") return "is-refunded";
  return "is-problem";
}

export function paymentSummary(payments: Payment[]) {
  const confirmed = payments
    .filter((payment) => payment.status === "confirmed")
    .reduce((sum, payment) => sum + payment.amount_cents, 0);
  const pending = payments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + payment.amount_cents, 0);
  const refunded = payments
    .filter((payment) => payment.status === "refunded")
    .reduce((sum, payment) => sum + payment.amount_cents, 0);

  return {
    confirmed,
    pending,
    refunded,
    confirmedCount: payments.filter((payment) => payment.status === "confirmed").length,
    pendingCount: payments.filter((payment) => payment.status === "pending").length,
  };
}

export function mapMercadoPagoStatus(value: string): PaymentStatus {
  switch (value) {
    case "approved":
      return "confirmed";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "rejected":
    case "cancelled":
      return "rejected";
    case "pending":
    case "in_process":
    case "in_mediation":
    case "authorized":
      return "pending";
    default:
      return "failed";
  }
}

export function penMajorFromCents(cents: number) {
  if (!Number.isInteger(cents) || cents < 1 || cents > 99999999)
    throw new Error("Importe PEN fuera de rango.");
  return Number((cents / 100).toFixed(2));
}

export function centsFromProviderMajor(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return null;
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 99999999)
    return null;
  return cents;
}
