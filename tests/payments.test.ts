import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import {
  centsFromProviderMajor,
  mapMercadoPagoStatus,
  paymentSummary,
  penMajorFromCents,
} from "../lib/payments";
import {
  extractMercadoPagoPaymentId,
  verifyMercadoPagoSignature,
} from "../lib/payments/mercadopago-verify";
import type { Payment } from "../lib/types";

function signedHeaders({
  paymentId,
  requestId,
  timestamp,
  secret,
}: {
  paymentId: string;
  requestId: string;
  timestamp: number;
  secret: string;
}) {
  const signed =
    `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
  const signature = crypto
    .createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(signed, "utf8")
    .digest("hex");

  return new Headers({
    "x-request-id": requestId,
    "x-signature": `ts=${timestamp},v1=${signature}`,
  });
}

test("Mercado Pago signature accepts valid event and rejects tampering", () => {
  const secret = "whsec-yemape-test";
  const timestamp = 1_800_000_000;
  const paymentId = "99999";
  const requestId = "req-yemape-1";
  const notificationUrl = `https://yemape.example/api/payments/mercadopago/webhook?data.id=${paymentId}&type=payment`;
  const rawBody = JSON.stringify({
    id: 12345,
    type: "payment",
    action: "payment.updated",
    data: { id: paymentId },
  });
  const headers = signedHeaders({
    paymentId,
    requestId,
    timestamp,
    secret,
  });

  assert.equal(
    verifyMercadoPagoSignature({
      rawBody,
      notificationUrl,
      headers,
      secret,
      nowSeconds: timestamp,
    }),
    true,
  );

  assert.equal(
    verifyMercadoPagoSignature({
      rawBody,
      notificationUrl,
      headers,
      secret: "wrong-secret",
      nowSeconds: timestamp,
    }),
    false,
  );

  const tampered = rawBody.replace('"99999"', '"88888"');
  assert.equal(
    verifyMercadoPagoSignature({
      rawBody: tampered,
      notificationUrl,
      headers,
      secret,
      nowSeconds: timestamp,
    }),
    false,
  );

  assert.equal(
    verifyMercadoPagoSignature({
      rawBody,
      notificationUrl,
      headers,
      secret,
      nowSeconds: timestamp + 301,
    }),
    false,
  );

  assert.equal(
    verifyMercadoPagoSignature({
      rawBody,
      notificationUrl: notificationUrl.replace(paymentId, "88888"),
      headers,
      secret,
      nowSeconds: timestamp,
    }),
    false,
  );

  const milliseconds = timestamp * 1000;
  const msHeaders = signedHeaders({
    paymentId,
    requestId,
    timestamp: milliseconds,
    secret,
  });
  assert.equal(
    verifyMercadoPagoSignature({
      rawBody,
      notificationUrl,
      headers: msHeaders,
      secret,
      nowSeconds: timestamp,
    }),
    true,
  );
});

test("Mercado Pago extracts only safe payment identifiers", () => {
  assert.equal(
    extractMercadoPagoPaymentId(JSON.stringify({ data: { id: "987654" } })),
    "987654",
  );
  assert.equal(
    extractMercadoPagoPaymentId('{"data":{"id":99999999999999999999}}'),
    null,
  );
  assert.equal(extractMercadoPagoPaymentId("not-json"), null);
});

test("Mercado Pago statuses map to Yemape payment states", () => {
  assert.equal(mapMercadoPagoStatus("approved"), "confirmed");
  assert.equal(mapMercadoPagoStatus("pending"), "pending");
  assert.equal(mapMercadoPagoStatus("in_process"), "pending");
  assert.equal(mapMercadoPagoStatus("rejected"), "rejected");
  assert.equal(mapMercadoPagoStatus("refunded"), "refunded");
  assert.equal(mapMercadoPagoStatus("charged_back"), "refunded");
  assert.equal(mapMercadoPagoStatus("mystery"), "failed");
});

test("PEN conversion is deterministic for two decimal currency", () => {
  assert.equal(penMajorFromCents(12500), 125);
  assert.equal(penMajorFromCents(12555), 125.55);
  assert.equal(centsFromProviderMajor(125.55), 12555);
  assert.equal(centsFromProviderMajor(-2), null);
  assert.throws(() => penMajorFromCents(0));
});

test("payment summary counts only confirmed money as paid", () => {
  const base: Payment = {
    id: "11111111-1111-4111-8111-111111111111",
    order_id: "22222222-2222-4222-8222-222222222222",
    provider: "manual",
    method: "yape",
    status: "confirmed",
    amount_cents: 5000,
    currency: "PEN",
    reference: "",
    note: "",
    provider_payment_id: null,
    provider_preference_id: null,
    provider_checkout_url: null,
    idempotency_key: null,
    paid_at: null,
    verified_at: null,
    created_by: "admin",
    created_at: "2026-10-02T10:00:00Z",
    updated_at: "2026-10-02T10:00:00Z",
  };

  const summary = paymentSummary([
    base,
    {
      ...base,
      id: "33333333-3333-4333-8333-333333333333",
      status: "pending",
      amount_cents: 3000,
    },
    {
      ...base,
      id: "44444444-4444-4444-8444-444444444444",
      status: "refunded",
      amount_cents: 2000,
    },
  ]);

  assert.equal(summary.confirmed, 5000);
  assert.equal(summary.pending, 3000);
  assert.equal(summary.refunded, 2000);
  assert.equal(summary.confirmedCount, 1);
  assert.equal(summary.pendingCount, 1);
});


test("Pagos V2 migration keeps PL/pgSQL delimiters balanced", () => {
  const sql = readFileSync(
    new URL("../supabase/payments-v2.sql", import.meta.url),
    "utf8",
  );
  const openings = sql.match(/\bas \$\$/g) ?? [];
  const closings = sql.match(/\$\$;/g) ?? [];

  assert.equal(openings.length, closings.length);
  assert.doesNotMatch(sql, /\n\$;\n/);
  assert.match(sql, /create trigger sync_order_confirmed_payments_trigger/);
  assert.match(sql, /apply_mercadopago_payment_webhook/);
});
