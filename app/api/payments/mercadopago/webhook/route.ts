import { NextResponse } from "next/server";
import { verifyMercadoPagoSignature, extractMercadoPagoPaymentId } from "@/lib/payments/mercadopago-verify";
import { fetchMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { serviceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 256 * 1024;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  const db = serviceSupabase();

  if (!secret || !process.env.MP_ACCESS_TOKEN?.trim() || !db) {
    console.error("[mercadopago.webhook] configuración incompleta");
    return new NextResponse(null, { status: 500 });
  }

  const claimedLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(claimedLength) && claimedLength > MAX_BODY_BYTES)
    return new NextResponse(null, { status: 413 });

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES)
    return new NextResponse(null, { status: 413 });

  if (
    !verifyMercadoPagoSignature({
      rawBody,
      notificationUrl: request.url,
      headers: request.headers,
      secret,
    })
  )
    return new NextResponse(null, { status: 400 });

  let body: {
    id?: unknown;
    type?: unknown;
    action?: unknown;
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const eventId =
    typeof body.id === "string" || typeof body.id === "number"
      ? String(body.id)
      : "";
  const eventType =
    typeof body.action === "string"
      ? body.action
      : typeof body.type === "string"
        ? body.type
        : "unknown";
  const providerPaymentId = extractMercadoPagoPaymentId(rawBody);

  if (!eventId || !providerPaymentId)
    return new NextResponse(null, { status: 400 });

  // Un webhook válido puede compartir cuenta con otros productos. Solo procesamos pagos.
  if (body.type !== "payment") {
    console.log("[mercadopago.webhook] evento verificado no enrutable", {
      id: eventId,
      type: eventType,
    });
    return NextResponse.json({ received: true });
  }

  let payment;
  try {
    // PagoKit: la firma no cubre status/importe. La API autenticada es la fuente autoritativa.
    payment = await fetchMercadoPagoPayment(providerPaymentId);
  } catch {
    return new NextResponse(null, { status: 500 });
  }

  if (
    !payment.externalReference ||
    !UUID_RE.test(payment.externalReference)
  ) {
    console.log("[mercadopago.webhook] pago externo sin referencia Yemape", {
      id: eventId,
      type: eventType,
    });
    return NextResponse.json({ received: true, unmatched: true });
  }

  const { data, error } = await db.rpc("apply_mercadopago_payment_webhook", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_provider_payment_id: payment.providerPaymentId,
    p_payment_id: payment.externalReference,
    p_status: payment.status,
    p_amount_cents: payment.amountCents,
    p_currency: payment.currency,
    p_paid_at: payment.paidAt,
  });

  if (error) {
    console.error("[mercadopago.webhook] conciliación falló", {
      id: eventId,
      type: eventType,
      code: error.code,
    });
    return new NextResponse(null, { status: 500 });
  }

  console.log("[mercadopago.webhook]", {
    id: eventId,
    type: eventType,
    result: data,
  });

  return NextResponse.json({
    received: true,
    duplicate: data === "duplicate",
  });
}
