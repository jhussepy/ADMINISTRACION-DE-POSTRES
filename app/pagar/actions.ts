"use server";

import { revalidatePath } from "next/cache";
import { parsePrice } from "@/lib/cart";
import { serviceSupabase } from "@/lib/supabase/service";
import { yapeConfiguration } from "@/lib/yape";
import { yapeProofExtension, YAPE_PROOF_MAX_BYTES } from "@/lib/yape-proof";
import type { ActionState } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitYapeProof(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const token = String(form.get("token") ?? "").trim();
  const reference = String(form.get("reference") ?? "").trim();
  const file = form.get("proof");
  const db = serviceSupabase();

  if (!UUID_RE.test(token) || !db || !yapeConfiguration())
    return { error: "Este enlace de pago no está disponible." };
  if (reference.length > 120)
    return { error: "La referencia es demasiado larga." };
  if (!(file instanceof File) || file.size < 1 || file.size > YAPE_PROOF_MAX_BYTES)
    return { error: "Adjunta una captura JPG, PNG o WebP de hasta 5 MB." };

  let amountCents: number;
  try {
    amountCents = parsePrice(String(form.get("amount") ?? ""))!;
  } catch {
    return { error: "Escribe el importe exacto que enviaste por Yape." };
  }
  if (amountCents < 1)
    return { error: "El importe debe ser mayor que cero." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = yapeProofExtension(bytes, file.type);
  if (!extension)
    return { error: "La captura no tiene un formato JPG, PNG o WebP válido." };

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id,total_cents,deposit_cents,quote_required,status")
    .eq("yape_payment_token", token)
    .maybeSingle();
  if (orderError || !order)
    return { error: "No encontramos un pedido para este enlace." };

  const outstanding = order.total_cents - order.deposit_cents;
  if (order.status === "Cancelado" || order.quote_required || outstanding <= 0)
    return { error: "Este pedido todavía no admite un pago por Yape." };
  if (amountCents > outstanding)
    return { error: "El importe supera el saldo pendiente del pedido." };

  const { data: activeCheckout, error: checkoutError } = await db
    .from("payments")
    .select("id")
    .eq("order_id", order.id)
    .eq("provider", "mercadopago")
    .eq("status", "pending")
    .or("provider_expires_at.is.null,provider_expires_at.gt." + new Date().toISOString())
    .limit(1);
  if (checkoutError) return { error: "No pudimos revisar los enlaces activos." };
  if (activeCheckout?.length)
    return { error: "Este pedido tiene un enlace Mercado Pago vigente. No envíes dinero por Yape; coordina con la tienda qué medio usar." };

  const { data: pending, error: pendingError } = await db
    .from("payments")
    .select("id")
    .eq("order_id", order.id)
    .eq("method", "yape")
    .eq("status", "pending")
    .limit(1);
  if (pendingError) return { error: "No pudimos revisar el estado del pedido." };
  if (pending?.length)
    return { error: "Ya hay un pago por Yape pendiente de verificación para este pedido." };

  const { count, error: countError } = await db
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id)
    .eq("provider", "manual")
    .eq("method", "yape")
    .eq("created_by", "customer")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (countError) return { error: "No pudimos revisar los comprobantes enviados." };
  if ((count ?? 0) >= 5)
    return { error: "Ya se enviaron varios comprobantes hoy. Escríbenos por WhatsApp para revisarlos." };

  const paymentId = crypto.randomUUID();
  const { error: paymentError } = await db.from("payments").insert({
    id: paymentId,
    order_id: order.id,
    provider: "manual",
    method: "yape",
    status: "pending",
    amount_cents: amountCents,
    currency: "PEN",
    reference,
    note: "Comprobante enviado por el cliente desde el enlace privado.",
    created_by: "customer",
  });
  if (paymentError) {
    if (paymentError.code === "23505")
      return { error: "Ya tenemos un comprobante pendiente para este pedido. Espera nuestra verificación." };
    return { error: "No pudimos registrar el comprobante. Vuelve a intentarlo." };
  }

  const path = `${order.id}/${paymentId}/${crypto.randomUUID()}.${extension}`;
  try {
    const { error: uploadError } = await db.storage
      .from("payment-proofs")
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) throw new Error("upload");

    const { error: proofError } = await db.from("payment_proofs").insert({
      payment_id: paymentId,
      storage_path: path,
      original_name: file.name.slice(0, 180),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: "customer",
    });
    if (proofError) throw new Error("proof");
  } catch {
    await db.storage.from("payment-proofs").remove([path]);
    await db.from("payments").delete().eq("id", paymentId);
    return { error: "No pudimos guardar la captura. Inténtalo nuevamente." };
  }

  revalidatePath("/pagar/" + token);
  revalidatePath("/admin/pedidos/" + order.id);
  revalidatePath("/admin/pagos");
  return { success: "Recibimos tu comprobante. Verificaremos el pago antes de actualizar el saldo." };
}
