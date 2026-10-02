import crypto from "node:crypto";

const SIGNATURE_HEADER = "x-signature";
const REQUEST_ID_HEADER = "x-request-id";
const TOLERANCE_SECONDS = 300;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function unpackSignatureHeader(value: string) {
  const signatures: string[] = [];
  let timestamp: string | undefined;

  for (const rawPart of value.split(",")) {
    const part = rawPart.trim();
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const val = part.slice(index + 1).trim();
    if (key === "v1" && val) signatures.push(val);
    if (key === "ts" && val) timestamp = val;
  }

  return { signatures, timestamp };
}

export function extractMercadoPagoPaymentId(rawBody: string) {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const value = (data as { id?: unknown }).id;

  if (typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value))
    return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    return String(value);
  return null;
}

/**
 * PagoKit family: hmac_field_concat.
 * Mercado Pago signs:
 * id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * The signature authenticates that short string, NOT the full webhook body.
 * The caller must re-fetch the payment before acting on amount or status.
 */
export function verifyMercadoPagoSignature({
  rawBody,
  headers,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  rawBody: string;
  headers: Headers;
  secret: string;
  nowSeconds?: number;
}) {
  if (!secret) return false;

  const rawSignature = headers.get(SIGNATURE_HEADER);
  const requestId = headers.get(REQUEST_ID_HEADER);
  if (!rawSignature || !requestId) return false;

  const paymentId = extractMercadoPagoPaymentId(rawBody);
  if (!paymentId) return false;

  const { signatures, timestamp } = unpackSignatureHeader(rawSignature);
  if (!timestamp || signatures.length === 0) return false;

  const ts = Number(timestamp);
  const skew = Math.abs(nowSeconds - ts);
  if (!Number.isFinite(skew) || skew > TOLERANCE_SECONDS) return false;

  const signed = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
  const expected = crypto
    .createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(signed, "utf8")
    .digest("hex");

  let matched = false;
  for (const presented of signatures)
    if (safeEqual(expected, presented)) matched = true;

  return matched;
}
