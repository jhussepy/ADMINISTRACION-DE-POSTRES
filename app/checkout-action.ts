"use server";
import { getProducts } from "@/lib/data";
import { whatsappUrl, normalizeCart } from "@/lib/cart";
import type { CheckoutDetails } from "@/lib/types";
export async function prepareCheckout(
  cart: unknown,
  details: CheckoutDetails,
): Promise<{ url?: string; error?: string }> {
  try {
    if (
      !details ||
      typeof details.name !== "string" ||
      typeof details.date !== "string" ||
      typeof details.address !== "string" ||
      typeof details.notes !== "string" ||
      (details.cakeGuests !== undefined &&
        typeof details.cakeGuests !== "string") ||
      (details.cakeFlavor !== undefined &&
        typeof details.cakeFlavor !== "string") ||
      (details.cakeDesign !== undefined &&
        typeof details.cakeDesign !== "string")
    )
      return { error: "Revisa los datos de tu pedido." };
    const products = await getProducts();
    if (!Array.isArray(cart) || cart.length > 100)
      return { error: "Revisa el contenido del carrito." };
    const clean = normalizeCart(cart, products);
    if (
      clean.length !== cart.length ||
      cart.some(
        (item, i) =>
          item?.id !== clean[i]?.id || item?.quantity !== clean[i]?.quantity,
      )
    )
      return {
        error:
          "Cambió la disponibilidad de un producto. Actualiza la página y revisa tu carrito.",
      };
    return { url: whatsappUrl(clean, products, details) };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No pudimos preparar el pedido. Inténtalo de nuevo.",
    };
  }
}
