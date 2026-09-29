import "server-only";
import { cache } from "react";
import { supabase } from "./supabase/server";
import { initialProducts } from "./products";
import type { Product, ProductVariant, Profile } from "./types";
import { notFound, redirect } from "next/navigation";
export const getProducts = cache(async (): Promise<Product[]> => {
  const db = await supabase();
  if (!db) return initialProducts;
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error)
    throw new Error("No se pudo cargar el catálogo. Inténtalo de nuevo.");

  const products = data as Product[];
  const { data: variants, error: variantsError } = await db
    .from("product_variants")
    .select("id,product_id,slug,label,price_cents,active,sort_order")
    .eq("active", true)
    .order("sort_order");

  // Compatibilidad de despliegue: si todavía no se ejecutó la migración V2,
  // la tienda sigue funcionando con las presentaciones actuales.
  if (variantsError) return products;

  const byProduct = new Map<string, ProductVariant[]>();
  for (const variant of (variants ?? []) as ProductVariant[]) {
    const list = byProduct.get(variant.product_id) ?? [];
    list.push(variant);
    byProduct.set(variant.product_id, list);
  }

  return products.map((product) => ({
    ...product,
    variants: byProduct.get(product.id) ?? [],
  }));
});
export const getAccount = cache(async () => {
  const db = await supabase();
  if (!db) return null;
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: admin }] = await Promise.all([
    db
      .from("profiles")
      .select("full_name,address,phone")
      .eq("id", user.id)
      .maybeSingle(),
    db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  return { user, profile: profile as Profile | null, isAdmin: Boolean(admin) };
});
export async function requireAdmin() {
  const account = await getAccount();
  if (!account) redirect("/cuenta");
  if (!account.isAdmin) notFound();
  return (await supabase())!;
}
