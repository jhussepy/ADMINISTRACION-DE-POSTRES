import "server-only";
import {
  centsFromProviderMajor,
  mapMercadoPagoStatus,
  penMajorFromCents,
} from "@/lib/payments";
import type { PaymentStatus } from "@/lib/types";

const MP_API = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 15000;

function accessToken() {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("MP_ACCESS_TOKEN no está configurado.");
  return token;
}

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) throw new Error("NEXT_PUBLIC_SITE_URL no está configurado.");
  return raw.replace(/\/$/, "");
}

async function mpFetch(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(MP_API + path, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export function mercadoPagoConfigured() {
  return Boolean(
    process.env.MP_ACCESS_TOKEN?.trim() &&
      process.env.MP_WEBHOOK_SECRET?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  );
}

export async function createMercadoPagoPreference({
  paymentId,
  orderId,
  orderCode,
  amountCents,
  idempotencyKey,
  expiresAt,
}: {
  paymentId: string;
  orderId: string;
  orderCode: string;
  amountCents: number;
  idempotencyKey: string;
  expiresAt: string;
}) {
  const base = siteUrl();
  const response = await mpFetch("/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      items: [
        {
          id: orderId,
          title: `Pedido ${orderCode} · Repostería Yemape`,
          quantity: 1,
          currency_id: "PEN",
          unit_price: penMajorFromCents(amountCents),
        },
      ],
      external_reference: paymentId,
      expires: true,
      expiration_date_to: expiresAt,
      back_urls: {
        success: `${base}/pago/resultado`,
        pending: `${base}/pago/resultado`,
        failure: `${base}/pago/resultado`,
      },
      auto_return: "approved",
      notification_url: `${base}/api/payments/mercadopago/webhook`,
    }),
  });

  if (!response.ok) {
    console.error("[mercadopago.checkout] create failed", {
      status: response.status,
      paymentId,
    });
    throw new Error("Mercado Pago no pudo crear el enlace.");
  }

  const body = (await response.json()) as {
    id?: unknown;
    init_point?: unknown;
  };

  if (
    typeof body.id !== "string" ||
    typeof body.init_point !== "string" ||
    !body.init_point.startsWith("https://")
  )
    throw new Error("Mercado Pago devolvió una respuesta incompleta.");

  return {
    preferenceId: body.id,
    checkoutUrl: body.init_point,
  };
}

export type MercadoPagoAuthoritativePayment = {
  providerPaymentId: string;
  externalReference: string | null;
  status: PaymentStatus;
  amountCents: number;
  currency: "PEN";
  paidAt: string | null;
};

export async function fetchMercadoPagoPayment(
  providerPaymentId: string,
): Promise<MercadoPagoAuthoritativePayment> {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(providerPaymentId))
    throw new Error("Identificador de pago inválido.");

  const response = await mpFetch(
    "/v1/payments/" + encodeURIComponent(providerPaymentId),
    {
      headers: {
        Authorization: `Bearer ${accessToken()}`,
      },
    },
  );

  if (!response.ok) {
    console.error("[mercadopago.webhook] refetch failed", {
      status: response.status,
      providerPaymentId,
    });
    throw new Error("No se pudo confirmar el pago con Mercado Pago.");
  }

  const body = (await response.json()) as {
    id?: unknown;
    status?: unknown;
    transaction_amount?: unknown;
    currency_id?: unknown;
    external_reference?: unknown;
    date_approved?: unknown;
  };

  const id =
    typeof body.id === "string" || typeof body.id === "number"
      ? String(body.id)
      : "";
  const amountCents = centsFromProviderMajor(body.transaction_amount);
  const currency = body.currency_id;

  if (
    !id ||
    typeof body.status !== "string" ||
    amountCents === null ||
    currency !== "PEN"
  )
    throw new Error("El pago remoto no contiene datos válidos para PEN.");

  return {
    providerPaymentId: id,
    externalReference:
      typeof body.external_reference === "string"
        ? body.external_reference
        : null,
    status: mapMercadoPagoStatus(body.status),
    amountCents,
    currency: "PEN",
    paidAt:
      typeof body.date_approved === "string" ? body.date_approved : null,
  };
}
