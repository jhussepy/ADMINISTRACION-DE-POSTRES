"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/data";
import { categories, orderStatuses, type ActionState } from "@/lib/types";
import { parsePrice, validDate } from "@/lib/cart";
const val = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRODUCT_ID_RE = /^[a-zA-Z0-9_-]{1,80}$/;
const LOCAL_PRODUCT_IMAGE_RE =
  /^\/images\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/;
const NEW_PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";
const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_PRODUCT_IMAGES = 8;
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const migrationMissing = (code?: string) =>
  Boolean(code && ["42P01", "PGRST205", "404"].includes(code));

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
  const existingId = val(d, "id");
  const isNew = !existingId;
  const id = existingId || crypto.randomUUID();
  const name = val(d, "name");
  const description = val(d, "description");
  const category = val(d, "category");
  const presentation = val(d, "presentation") || "Varias presentaciones";
  const image = val(d, "image") || NEW_PRODUCT_PLACEHOLDER;
  const sort_order = Number(val(d, "sort_order"));

  if (
    !PRODUCT_ID_RE.test(id) ||
    name.length < 3 ||
    name.length > 120 ||
    description.length > 500 ||
    presentation.length < 2 ||
    presentation.length > 120 ||
    !categories.some((item) => item === category) ||
    !LOCAL_PRODUCT_IMAGE_RE.test(image) ||
    !Number.isInteger(sort_order) ||
    sort_order < 0 ||
    sort_order > 999
  )
    return {
      error: "Revisa el nombre, categoría, descripción y orden del producto.",
    };

  let price_cents: number | null = null;
  if (!isNew) {
    try {
      price_cents = parsePrice(val(d, "price"), true);
    } catch {
      return {
        error:
          "El precio base anterior no es válido. Revisa las presentaciones del producto.",
      };
    }
  }

  const initialVariants: Array<{
    id: string;
    product_id: string;
    slug: string;
    label: string;
    price_cents: number | null;
    active: boolean;
    sort_order: number;
  }> = [];

  if (isNew) {
    const portionActive = d.get("initial_portion_active") === "on";
    const wholeActive = d.get("initial_whole_active") === "on";

    if (!portionActive && !wholeActive)
      return {
        error:
          "Activa al menos una presentación: porción individual o entero.",
      };

    try {
      if (portionActive)
        initialVariants.push({
          id: crypto.randomUUID(),
          product_id: id,
          slug: "porcion-individual",
          label: "Porción individual",
          price_cents: parsePrice(val(d, "initial_portion_price"), true),
          active: true,
          sort_order: 10,
        });

      if (wholeActive)
        initialVariants.push({
          id: crypto.randomUUID(),
          product_id: id,
          slug: "entero",
          label: "Entero",
          price_cents: parsePrice(val(d, "initial_whole_price"), true),
          active: true,
          sort_order: 20,
        });
    } catch {
      return {
        error:
          "Revisa los precios de porción y entero. Usa hasta dos decimales.",
      };
    }
  }

  const initialFile = d.get("initial_image");
  let initialImage:
    | { file: File; extension: string; contentType: string }
    | null = null;

  if (isNew && initialFile instanceof File && initialFile.size > 0) {
    if (initialFile.size > MAX_PRODUCT_IMAGE_BYTES)
      return { error: "La fotografía no puede superar 5 MB." };

    const extension = PRODUCT_IMAGE_TYPES.get(initialFile.type);
    if (!extension)
      return { error: "Usa una fotografía JPG, PNG o WebP." };

    initialImage = {
      file: initialFile,
      extension,
      contentType: initialFile.type,
    };
  }

  const productPayload = {
    id,
    name,
    description,
    category,
    presentation,
    image: isNew ? NEW_PRODUCT_PLACEHOLDER : image,
    price_cents,
    active: d.get("active") === "on",
    sort_order,
  };

  const productResult = isNew
    ? await db.from("products").insert(productPayload)
    : await db.from("products").update(productPayload).eq("id", id);

  if (productResult.error) {
    if (
      isNew &&
      productResult.error.code === "23514" &&
      productResult.error.message.includes("products_image_check")
    )
      return {
        error:
          "Falta activar Nuevo Producto V4 en Supabase. Ejecuta supabase/new-product-v4.sql y vuelve a intentarlo.",
      };
    return { error: "No pudimos guardar el producto." };
  }

  if (isNew && initialVariants.length > 0) {
    const { error: variantsError } = await db
      .from("product_variants")
      .insert(initialVariants);

    if (variantsError) {
      await db.from("products").delete().eq("id", id);
      if (migrationMissing(variantsError.code))
        return {
          error:
            "Commerce V2 no está disponible. Ejecuta supabase/variants-v2.sql.",
        };
      return {
        error:
          "No pudimos crear las presentaciones iniciales. El producto no fue guardado.",
      };
    }
  }

  if (isNew && initialImage) {
    const path = `${id}/${crypto.randomUUID()}.${initialImage.extension}`;
    const bytes = new Uint8Array(await initialImage.file.arrayBuffer());
    const { error: uploadError } = await db.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, bytes, {
        contentType: initialImage.contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      await db.from("products").delete().eq("id", id);
      return {
        error:
          "No pudimos subir la fotografía. El producto no fue creado para evitar datos incompletos.",
      };
    }

    const { error: imageError } = await db.from("product_images").insert({
      product_id: id,
      storage_path: path,
      alt_text: `Fotografía de ${name}`,
      is_cover: true,
      active: true,
      sort_order: 10,
    });

    if (imageError) {
      await db.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
      await db.from("products").delete().eq("id", id);
      return {
        error:
          "No pudimos conectar la fotografía con el producto. No se guardaron cambios.",
      };
    }
  }

  revalidateProduct(id);

  if (isNew)
    redirect(`/admin/productos?editar=${encodeURIComponent(id)}&creado=1`);

  return { success: "Información del producto actualizada." };
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

export async function uploadProductImage(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const product_id = val(d, "product_id");
  const alt_text = val(d, "alt_text");
  const file = d.get("file");

  if (!PRODUCT_ID_RE.test(product_id))
    return { error: "No pudimos identificar el producto." };
  if (alt_text.length > 160)
    return { error: "El texto alternativo admite hasta 160 caracteres." };
  if (!(file instanceof File) || file.size === 0)
    return { error: "Selecciona una fotografía." };
  if (file.size > MAX_PRODUCT_IMAGE_BYTES)
    return { error: "La fotografía no puede superar 5 MB." };

  const extension = PRODUCT_IMAGE_TYPES.get(file.type);
  if (!extension)
    return { error: "Usa una imagen JPG, PNG o WebP." };

  const [{ data: product, error: productError }, countResult] =
    await Promise.all([
      db.from("products").select("id,name").eq("id", product_id).maybeSingle(),
      db
        .from("product_images")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product_id),
    ]);

  if (productError || !product)
    return { error: "No encontramos el producto." };
  if (countResult.error) {
    if (migrationMissing(countResult.error.code))
      return {
        error:
          "Galería V3 aún no está activada. Ejecuta supabase/product-images-v3.sql en Supabase.",
      };
    return { error: "No pudimos preparar la galería." };
  }

  const count = countResult.count ?? 0;
  if (count >= MAX_PRODUCT_IMAGES)
    return {
      error: `Este producto ya tiene el máximo de ${MAX_PRODUCT_IMAGES} fotografías.`,
    };

  const path = `${product_id}/${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await db.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError)
    return {
      error:
        "No pudimos subir la fotografía. Comprueba que Storage V3 esté activado.",
    };

  const { error: insertError } = await db.from("product_images").insert({
    product_id,
    storage_path: path,
    alt_text: alt_text || `Fotografía de ${product.name}`,
    is_cover: count === 0,
    active: true,
    sort_order: (count + 1) * 10,
  });

  if (insertError) {
    await db.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
    return { error: "La fotografía subió, pero no pudimos guardarla." };
  }

  revalidateProduct(product_id);
  return {
    success:
      count === 0
        ? "Fotografía subida y establecida como portada."
        : "Fotografía añadida a la galería.",
  };
}

export async function saveProductImage(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const id = val(d, "image_id");
  const product_id = val(d, "product_id");
  const alt_text = val(d, "alt_text");
  const sort_order = Number(val(d, "sort_order"));

  if (
    !UUID_RE.test(id) ||
    !PRODUCT_ID_RE.test(product_id) ||
    alt_text.length > 160 ||
    !Number.isInteger(sort_order) ||
    sort_order < 0 ||
    sort_order > 999
  )
    return { error: "Revisa el texto y el orden de la fotografía." };

  const { error } = await db
    .from("product_images")
    .update({
      alt_text,
      active: d.get("active") === "on",
      sort_order,
    })
    .eq("id", id)
    .eq("product_id", product_id);

  if (error) {
    if (migrationMissing(error.code))
      return {
        error:
          "Galería V3 aún no está activada. Ejecuta supabase/product-images-v3.sql.",
      };
    return { error: "No pudimos actualizar la fotografía." };
  }

  revalidateProduct(product_id);
  return { success: "Fotografía actualizada." };
}

export async function setProductImageCover(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const id = val(d, "image_id");
  const product_id = val(d, "product_id");

  if (!UUID_RE.test(id) || !PRODUCT_ID_RE.test(product_id))
    return { error: "No pudimos identificar la fotografía." };

  const { error } = await db.rpc("set_product_image_cover", {
    target_id: id,
  });

  if (error) {
    if (migrationMissing(error.code))
      return {
        error:
          "Galería V3 aún no está activada. Ejecuta supabase/product-images-v3.sql.",
      };
    return { error: "No pudimos cambiar la portada." };
  }

  revalidateProduct(product_id);
  return { success: "Nueva portada publicada." };
}

export async function deleteProductImage(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const id = val(d, "image_id");
  const product_id = val(d, "product_id");

  if (!UUID_RE.test(id) || !PRODUCT_ID_RE.test(product_id))
    return { error: "No pudimos identificar la fotografía." };

  const { data: image, error: readError } = await db
    .from("product_images")
    .select("storage_path,is_cover")
    .eq("id", id)
    .eq("product_id", product_id)
    .maybeSingle();

  if (readError || !image)
    return { error: "No encontramos la fotografía." };

  const { error: deleteError } = await db
    .from("product_images")
    .delete()
    .eq("id", id)
    .eq("product_id", product_id);

  if (deleteError)
    return { error: "No pudimos eliminar la fotografía." };

  await db.storage.from(PRODUCT_IMAGE_BUCKET).remove([image.storage_path]);

  if (image.is_cover) {
    const { data: nextCover } = await db
      .from("product_images")
      .select("id")
      .eq("product_id", product_id)
      .eq("active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

    if (nextCover?.id)
      await db.rpc("set_product_image_cover", {
        target_id: nextCover.id,
      });
  }

  revalidateProduct(product_id);
  return { success: "Fotografía eliminada de la galería." };
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
      status: "Por confirmar",
      source: "manual",
    });
  if (error) return { error: "No pudimos guardar el pedido." };
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  return {
    success:
      "Pedido registrado como por confirmar. Ya tiene un código Yemape asignado.",
  };
}
export async function updateOrder(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const id = val(d, "id");
  const status = val(d, "status");
  const quoteResolved = d.get("quote_resolved") === "on";

  if (!UUID_RE.test(id) || !orderStatuses.some((s) => s === status))
    return { error: "Pedido o estado no válido." };

  let total_cents: number;
  let deposit_cents: number;
  try {
    total_cents = parsePrice(val(d, "total"))!;
    deposit_cents = parsePrice(val(d, "deposit"))!;
  } catch {
    return { error: "Revisa el total y el importe abonado." };
  }

  if (quoteResolved && total_cents <= 0)
    return {
      error:
        "Indica el total final antes de marcar la cotización como confirmada.",
    };

  if (deposit_cents > total_cents)
    return { error: "El importe abonado no puede superar el total." };

  const { data: order, error: readError } = await db
    .from("orders")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (readError || !order) return { error: "No encontramos el pedido." };

  const { error } = await db
    .from("orders")
    .update({
      status,
      total_cents,
      deposit_cents,
      quote_required: !quoteResolved,
    })
    .eq("id", id);

  if (error) return { error: "No pudimos actualizar el pedido." };

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/pedidos/" + id);
  return { success: "Pedido actualizado." };
}


export async function saveCustomerNote(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const customer_id = val(d, "customer_id");
  const note = val(d, "note");

  if (!UUID_RE.test(customer_id))
    return { error: "No pudimos identificar al cliente." };
  if (note.length < 2 || note.length > 1000)
    return { error: "La nota debe tener entre 2 y 1000 caracteres." };

  const { data: customer, error: customerError } = await db
    .from("customers")
    .select("id")
    .eq("id", customer_id)
    .maybeSingle();

  if (customerError || !customer)
    return { error: "No encontramos al cliente." };

  const { error } = await db.from("customer_notes").insert({
    customer_id,
    note,
  });

  if (error) {
    if (migrationMissing(error.code))
      return {
        error:
          "Clientes V1 aún no está activado. Ejecuta supabase/customers-v1.sql.",
      };
    return { error: "No pudimos guardar la nota interna." };
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/admin/clientes/" + customer_id);
  return { success: "Nota interna guardada." };
}

export async function deleteCustomerNote(
  _: ActionState,
  d: FormData,
): Promise<ActionState> {
  const db = await requireAdmin();
  const note_id = val(d, "note_id");
  const customer_id = val(d, "customer_id");

  if (!UUID_RE.test(note_id) || !UUID_RE.test(customer_id))
    return { error: "No pudimos identificar la nota." };

  const { error } = await db
    .from("customer_notes")
    .delete()
    .eq("id", note_id)
    .eq("customer_id", customer_id);

  if (error) {
    if (migrationMissing(error.code))
      return {
        error:
          "Clientes V1 aún no está activado. Ejecuta supabase/customers-v1.sql.",
      };
    return { error: "No pudimos eliminar la nota." };
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/admin/clientes/" + customer_id);
  return { success: "Nota eliminada." };
}
