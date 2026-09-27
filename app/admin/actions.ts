"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { categories, orderStatuses, type ActionState } from "@/lib/types";
import { productImages } from "@/lib/products";
import { parsePrice, validDate } from "@/lib/cart";
const val = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
export async function saveProduct(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const id = val(d, "id") || crypto.randomUUID(),
    name = val(d, "name"),
    description = val(d, "description"),
    category = val(d, "category"),
    presentation = val(d, "presentation"),
    image = val(d, "image");
  if (
    id.length > 80 ||
    name.length < 3 ||
    name.length > 120 ||
    description.length > 500 ||
    presentation.length < 2 ||
    presentation.length > 120 ||
    !categories.some((c) => c === category) ||
    !productImages.some((i) => i.path === image)
  )
    return { error: "Revisa el nombre, categoría, presentación e imagen." };
  let price_cents;
  try {
    price_cents = parsePrice(val(d, "price"), true);
  } catch {
    return {
      error:
        "El precio debe ser un número válido con hasta dos decimales. Déjalo vacío para cotizar.",
    };
  }
  const sort_order = Number(val(d, "sort_order"));
  if (!Number.isInteger(sort_order) || sort_order < 0 || sort_order > 999)
    return { error: "El orden debe estar entre 0 y 999." };
  const { error } = await db
    .from("products")
    .upsert({
      id,
      name,
      description,
      category,
      presentation,
      image,
      price_cents,
      active: d.get("active") === "on",
      sort_order,
    });
  if (error) return { error: "No pudimos guardar el producto." };
  revalidatePath("/");
  revalidatePath("/admin/productos");
  return { success: "Producto guardado. Ya se actualizó el catálogo." };
}
export async function saveOrder(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const customer_name = val(d, "customer_name"),
    customer_phone = val(d, "customer_phone"),
    details = val(d, "details"),
    delivery_date = val(d, "delivery_date");
  if (
    customer_name.length < 2 ||
    customer_name.length > 100 ||
    !/^\+?[\d\s()-]{7,20}$/.test(customer_phone) ||
    details.length < 3 ||
    details.length > 2000 ||
    !validDate(delivery_date)
  )
    return { error: "Revisa el cliente, teléfono, detalle y fecha." };
  let total_cents, deposit_cents;
  try {
    total_cents = parsePrice(val(d, "total"))!;
    deposit_cents = parsePrice(val(d, "deposit") || "0")!;
  } catch {
    return { error: "Escribe importes válidos con hasta dos decimales." };
  }
  if (total_cents <= 0 || deposit_cents > total_cents)
    return {
      error: "El total debe ser mayor a cero y el adelanto no puede superarlo.",
    };
  const { error } = await db
    .from("orders")
    .insert({
      customer_name,
      customer_phone,
      details,
      delivery_date,
      total_cents,
      deposit_cents,
      status: "Pendiente",
    });
  if (error) return { error: "No pudimos guardar el pedido." };
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  return {
    success:
      "Pedido registrado como pendiente. Puedes actualizar su estado cuando lo confirmes.",
  };
}
export async function updateOrder(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const id = val(d, "id"),
    status = val(d, "status");
  if (!orderStatuses.some((s) => s === status))
    return { error: "Estado no válido." };
  let deposit_cents;
  try {
    deposit_cents = parsePrice(val(d, "deposit"))!;
  } catch {
    return { error: "Revisa el importe abonado." };
  }
  const { data: order, error: readError } = await db
    .from("orders")
    .select("total_cents")
    .eq("id", id)
    .single();
  if (readError || !order) return { error: "No encontramos el pedido." };
  if (deposit_cents > order.total_cents)
    return { error: "El importe abonado no puede superar el total." };
  const { error } = await db
    .from("orders")
    .update({ status, deposit_cents })
    .eq("id", id);
  if (error) return { error: "No pudimos actualizar el pedido." };
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  return { success: "Pedido actualizado." };
}
