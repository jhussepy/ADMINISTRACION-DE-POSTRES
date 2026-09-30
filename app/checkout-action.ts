"use server";

import { getProducts } from "@/lib/data";
import { supabase } from "@/lib/supabase/server";
import {
  checkoutError,
  limaToday,
  normalizeCart,
  whatsappUrl,
} from "@/lib/cart";
import { presentation } from "@/lib/demo-catalog";
import type { CheckoutDetails } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CheckoutResult = {
  url?: string;
  orderCode?: string;
  error?: string;
};

export async function prepareCheckout(
  cart: unknown,
  details: CheckoutDetails,
  checkoutKey?: string,
): Promise<CheckoutResult> {
  try {
    if (
      !details ||
      typeof details.name !== "string" ||
      typeof details.phone !== "string" ||
      typeof details.date !== "string" ||
      typeof details.address !== "string" ||
      typeof details.notes !== "string" ||
      (details.cakeGuests !== undefined &&
        typeof details.cakeGuests !== "string") ||
      (details.cakeFlavor !== undefined &&
        typeof details.cakeFlavor !== "string") ||
      (details.cakeDesign !== undefined &&
        typeof details.cakeDesign !== "string") ||
      (details.occasion !== undefined &&
        typeof details.occasion !== "string") ||
      (details.giftNote !== undefined && typeof details.giftNote !== "string")
    )
      return { error: "Revisa los datos de tu pedido." };

    if (!Array.isArray(cart) || cart.length > 100)
      return { error: "Revisa el contenido del carrito." };

    const products = await getProducts();
    const clean = normalizeCart(cart, products);

    if (
      clean.length !== cart.length ||
      cart.some(
        (item, i) =>
          item?.id !== clean[i]?.id ||
          item?.quantity !== clean[i]?.quantity ||
          (item.variant !== undefined
            ? item.variant
            : presentation(
                products.find((p) => p.id === item.id)!,
                undefined,
              )?.id) !== clean[i]?.variant,
      )
    )
      return {
        error:
          "Cambió la disponibilidad de un producto. Actualiza la página y revisa tu carrito.",
      };

    const hasCustomCake = clean.some(
      (item) => item.id === "torta-personalizada",
    );
    const problem = checkoutError(
      details,
      limaToday(),
      hasCustomCake,
    );
    if (problem) return { error: problem };

    const db = await supabase();

    // Mantiene el proyecto comprobable sin servicios externos en CI/dev.
    if (!db) return { url: whatsappUrl(clean, products, details) };

    if (!checkoutKey || !UUID_RE.test(checkoutKey))
      return {
        error:
          "No pudimos identificar esta solicitud. Cierra y vuelve a abrir el carrito.",
      };

    const cakeGuests = details.cakeGuests?.trim()
      ? Number(details.cakeGuests)
      : null;

    const { data, error } = await db.rpc("create_checkout_order_v2", {
      p_checkout_key: checkoutKey,
      p_customer_name: details.name.trim(),
      p_customer_phone: details.phone.trim(),
      p_delivery_method: details.delivery,
      p_delivery_address:
        details.delivery === "delivery" ? details.address.trim() : "",
      p_delivery_date: details.date,
      p_occasion: details.occasion?.trim() ?? "",
      p_gift_note: details.giftNote?.trim() ?? "",
      p_notes: details.notes.trim(),
      p_cake_guests: cakeGuests,
      p_cake_flavor: details.cakeFlavor?.trim() ?? "",
      p_cake_design: details.cakeDesign?.trim() ?? "",
      p_items: clean.map((item) => ({
        product_id: item.id,
        variant_id: item.variant,
        quantity: item.quantity,
      })),
    });

    if (error) {
      if (["PGRST202", "42883"].includes(error.code))
        return {
          error:
            "Pedidos V2 aún no está activado. Ejecuta supabase/orders-v2.sql en Supabase.",
        };
      return {
        error:
          "No pudimos registrar tu solicitud. Tu carrito sigue guardado; inténtalo de nuevo.",
      };
    }

    const result = data as
      | {
          id?: string;
          public_code?: string;
          total_cents?: number;
          quote_required?: boolean;
        }
      | null;

    if (!result?.public_code)
      return {
        error:
          "El pedido fue procesado sin código. Inténtalo nuevamente antes de abrir WhatsApp.",
      };

    return {
      orderCode: result.public_code,
      url: whatsappUrl(clean, products, details, result.public_code),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos preparar el pedido. Inténtalo de nuevo.",
    };
  }
}
