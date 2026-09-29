import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "./supabase/server";
import { clerkConfigured } from "./clerk-auth";
import { initialProducts } from "./products";
import type {
  Product,
  ProductImage,
  ProductVariant,
  Profile,
} from "./types";
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
  const [variantsResult, imagesResult] = await Promise.all([
    db
      .from("product_variants")
      .select("id,product_id,slug,label,price_cents,active,sort_order")
      .eq("active", true)
      .order("sort_order"),
    db
      .from("product_images")
      .select(
        "id,product_id,storage_path,alt_text,is_cover,active,sort_order",
      )
      .eq("active", true)
      .order("sort_order"),
  ]);

  const missingTable = (code?: string) =>
    Boolean(code && ["42P01", "PGRST205"].includes(code));

  if (variantsResult.error && !missingTable(variantsResult.error.code))
    throw new Error(
      "No se pudieron cargar las presentaciones del catálogo. Inténtalo de nuevo.",
    );

  if (imagesResult.error && !missingTable(imagesResult.error.code))
    throw new Error(
      "No se pudieron cargar las imágenes del catálogo. Inténtalo de nuevo.",
    );

  const byProduct = new Map<string, ProductVariant[]>();
  for (const variant of (variantsResult.data ?? []) as ProductVariant[]) {
    const list = byProduct.get(variant.product_id) ?? [];
    list.push(variant);
    byProduct.set(variant.product_id, list);
  }

  const imagesByProduct = new Map<string, ProductImage[]>();
  for (const row of imagesResult.data ?? []) {
    const publicUrl = db.storage
      .from("product-images")
      .getPublicUrl(row.storage_path).data.publicUrl;
    const image: ProductImage = { ...row, url: publicUrl } as ProductImage;
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push(image);
    imagesByProduct.set(image.product_id, list);
  }

  return products.map((product) => {
    const gallery = (imagesByProduct.get(product.id) ?? []).sort(
      (a, b) =>
        Number(b.is_cover) - Number(a.is_cover) ||
        a.sort_order - b.sort_order,
    );
    const cover = gallery.find((image) => image.is_cover) ?? gallery[0];
    return {
      ...product,
      image: cover?.url ?? product.image,
      variants: byProduct.get(product.id) ?? [],
      gallery,
    };
  });
});
export const getAccount = cache(async () => {
  if (!clerkConfigured()) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const [db, clerkUser] = await Promise.all([supabase(), currentUser()]);
  if (!db) return null;

  const [profileResult, adminResult] = await Promise.all([
    db
      .from("profiles")
      .select("full_name,address,phone")
      .eq("id", userId)
      .maybeSingle(),
    db.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    "";
  const name =
    clerkUser?.fullName ??
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ");

  return {
    id: userId,
    email,
    name,
    profile: profileResult.error
      ? null
      : (profileResult.data as Profile | null),
    isAdmin: !adminResult.error && Boolean(adminResult.data),
  };
});
export async function requireAdmin() {
  const account = await getAccount();
  if (!account) redirect("/cuenta");
  if (!account.isAdmin) notFound();
  return (await supabase())!;
}
