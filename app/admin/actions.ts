"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { categories, orderStatuses, type ActionState } from "@/lib/types";
import { productImages } from "@/lib/products";
import { parsePrice, validDate } from "@/lib/cart";
const val = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function revalidateProduct(productId: string) {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/admin/productos");
  revalidatePath(`/postres/${productId}`);
}
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
  revalidateProduct(id);
  return { success: "Producto guardado. Ya se actualizó el catálogo." };
}

export async function saveVariant(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const existingId = val(d, "variant_id");
  const id = existingId || crypto.randomUUID();
  const product_id = val(d, "product_id");
  const slug = val(d, "slug").toLowerCase();
  const label = val(d, "label");
  const sort_order = Number(val(d, "sort_order"));

  if (
    (existingId && !UUID_RE.test(existingId)) ||
    product_id.length < 1 ||
    product_id.length > 80 ||
    slug.length < 1 ||
    slug.length > 50 ||
    !VARIANT_SLUG_RE.test(slug) ||
    label.length < 2 ||
    label.length > 120 ||
    !Number.isInteger(sort_order) ||
    sort_order < 0 ||
    sort_order > 999
  )
    return {
      error:
        "Revisa la presentación: usa un identificador como mediana, caja-6 o entero, una etiqueta válida y un orden entre 0 y 999.",
    };

  let price_cents;
  try {
    price_cents = parsePrice(val(d, "price"), true);
  } catch {
    return {
      error:
        "El precio debe ser válido con hasta dos decimales. Déjalo vacío para cotizar.",
    };
  }

  const { error } = await db.from("product_variants").upsert({
    id,
    product_id,
    slug,
    label,
    price_cents,
    active: d.get("active") === "on",
    sort_order,
  });

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code))
      return {
        error:
          "Variantes V2 aún no está activado en Supabase. Ejecuta supabase/variants-v2.sql y vuelve a intentarlo.",
      };
    if (error.code === "23505")
      return {
        error:
          "Ese identificador ya existe para este producto. Usa otro, por ejemplo grande, entero o caja-6.",
      };
    return { error: "No pudimos guardar la presentación." };
  }

  revalidateProduct(product_id);
  return {
    success: existingId
      ? "Presentación actualizada."
      : "Presentación creada y conectada al catálogo.",
  };
}

export async function deleteVariant(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const id = val(d, "variant_id");
  const product_id = val(d, "product_id");
  if (!UUID_RE.test(id) || !product_id || product_id.length > 80)
    return { error: "No pudimos identificar la presentación." };

  const { error } = await db
    .from("product_variants")
    .delete()
    .eq("id", id)
    .eq("product_id", product_id);

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code))
      return {
        error:
          "Variantes V2 aún no está activado en Supabase. Ejecuta supabase/variants-v2.sql.",
      };
    return { error: "No pudimos eliminar la presentación." };
  }

  revalidateProduct(product_id);
  return { success: "Presentación eliminada." };
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
